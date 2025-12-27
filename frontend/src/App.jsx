import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import './index.css';

function App() {
  const [ingredients, setIngredients] = useState('');
  const [productName, setProductName] = useState('');
  const [results, setResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [session, setSession] = useState(null);
  const [riskDictionary, setRiskDictionary] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [view, setView] = useState('home'); // 'home' or 'history'
  const [savedItems, setSavedItems] = useState([]);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 3. Fetch Risk Dictionary from Supabase
    fetchDictionary();

    return () => subscription.unsubscribe();
  }, []);

  const fetchDictionary = async () => {
    try {
      const { data, error } = await supabase
        .from('ingredients_dictionary')
        .select('name, risk_level, explanation');

      if (error) throw error;

      const dict = {};
      data.forEach(item => {
        dict[item.name.toLowerCase()] = {
          level: item.risk_level,
          desc: item.explanation
        };
      });
      setRiskDictionary(dict);
    } catch (error) {
      console.error('Error fetching dictionary:', error.message);
    }
  };

  const fetchSavedProducts = async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('saved_products')
        .select(`
          created_at,
          products (name, risk_level, ingredients_text)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedItems(data);
    } catch (error) {
      console.error('Error fetching history:', error.message);
    }
  };

  const processAnalysis = (text) => {
    const lowerText = text.toLowerCase();
    const items = lowerText.split(/[,;\n.]/).map(i => i.trim()).filter(Boolean);

    const findings = [];
    items.forEach(item => {
      for (const [key, info] of Object.entries(riskDictionary)) {
        if (item.includes(key)) {
          findings.push({ original: item, ...info });
          break;
        }
      }
    });

    const highestRisk = findings.some(f => f.level === 'high') ? 'high' :
      findings.some(f => f.level === 'medium') ? 'medium' : 'low';

    setResults({ findings, highestRisk });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setResults(null);

    // Simulate OCR Processing using Gemini logic
    setTimeout(() => {
      const mockExtracted = "Sugar, Vegetable Fat, Wheat Flour, Skimmed Milk Powder, Gelatin, Carmine, Artificial Flavor.";
      setIngredients(mockExtracted);
      setIsProcessing(false);
      processAnalysis(mockExtracted);
    }, 3000);
  };

  const handleSave = async () => {
    if (!productName) {
      alert('Please enter a product name before saving.');
      return;
    }
    setIsSaving(true);
    try {
      // 1. Insert product into 'products' table (or update if exists)
      const { data: productData, error: productError } = await supabase
        .from('products')
        .upsert({
          name: productName,
          ingredients_text: ingredients,
          risk_level: results.highestRisk
        }, { onConflict: 'name' })
        .select()
        .single();

      if (productError) throw productError;

      // 2. Link to user's saved list
      const { error: saveError } = await supabase
        .from('saved_products')
        .upsert({
          user_id: session.user.id,
          product_id: productData.id
        });

      if (saveError) throw saveError;
      alert('Product saved to your history!');
    } catch (error) {
      console.error('Error saving:', error.message);
      alert('Failed to save product.');
    } finally {
      setIsSaving(false);
    }
  };

  const checkIngredients = () => {
    processAnalysis(ingredients);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return (
      <div className="app-container">
        <header>
          <h1>HalalCheck</h1>
          <p className="subtitle">Sign in to start scanning ingredients</p>
        </header>
        <Auth />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Logged in as: {session.user.email}</p>
          <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid #334155', color: 'var(--text-muted)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}>Sign Out</button>
        </div>
        <h1>HalalCheck</h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button
            onClick={() => setView('home')}
            style={{
              background: 'none',
              border: 'none',
              color: view === 'home' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: '600',
              cursor: 'pointer',
              borderBottom: view === 'home' ? '2px solid var(--primary)' : 'none',
              padding: '0.5rem 1rem'
            }}
          >
            Scanner
          </button>
          <button
            onClick={() => {
              setView('history');
              fetchSavedProducts();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: view === 'history' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: '600',
              cursor: 'pointer',
              borderBottom: view === 'history' ? '2px solid var(--primary)' : 'none',
              padding: '0.5rem 1rem'
            }}
          >
            My History
          </button>
        </div>
        <p className="subtitle">
          {view === 'home' ? 'Instant Ingredient Risk Analysis' : 'Your Past Analysis Results'}
        </p>
      </header>

      <main>
        {view === 'home' ? (
          <>
            <div className="input-section">
              <input
                type="text"
                className="product-name-input"
                placeholder="Product Name (e.g. Haribo Goldbears)"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
              <textarea
                placeholder="Paste ingredients list here (e.g. Sugar, Gelatin, Carmine...)"
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
              />

              <div className="upload-section">
                <button className="btn-upload" onClick={() => document.getElementById('image-upload').click()}>
                  <span>📷</span> {isProcessing ? 'Processing Image...' : 'Scan Product Image'}
                </button>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                  disabled={isProcessing}
                />
              </div>

              <button className="btn-check" onClick={checkIngredients} style={{ marginTop: '1.5rem' }} disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Analyze Ingredients'}
              </button>
            </div>

            {isProcessing && (
              <div className="loading-container">
                <div className="spinner"></div>
                <p className="loading-text">Gemini is extracting ingredients from your image...</p>
              </div>
            )}

            <div className="scan-guidance">
              <h3><span>✨</span> Professional Scan Tips</h3>
              <ul>
                <li><strong>Lighting:</strong> Ensure the label is well-lit and avoid glare or shadows.</li>
                <li><strong>Flat Surface:</strong> Keep the packaging flat to avoid distorted text.</li>
                <li><strong>Full List:</strong> Include the entire ingredient block in the frame.</li>
                <li><strong>Sharp Focus:</strong> Hold your device steady for clear, crisp text.</li>
              </ul>
            </div>

            {results && (
              <div className="results-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`risk-badge ${results.highestRisk}`}>
                    Overall Risk: {results.highestRisk}
                  </span>
                  <button
                    className="btn-check"
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{ width: 'auto', padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}
                  >
                    {isSaving ? 'Saving...' : 'Save to History'}
                  </button>
                </div>

                {results.findings.length > 0 ? (
                  results.findings.map((f, i) => (
                    <div key={i} className={`ingredient-item ${f.level}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <strong>{f.original}</strong>
                        <span className={`risk-badge ${f.level}`}>{f.level}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {f.desc}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="ingredient-item low" style={{ textAlign: 'center' }}>
                    <p>No high-risk ingredients detected in our current database.</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Always double check for logos from trusted certification bodies.
                    </p>
                  </div>
                )}

                {results.highestRisk !== 'low' && (
                  <div className="input-section" style={{ marginTop: '1rem', border: '1px dashed var(--primary)' }}>
                    <h3>Safer Alternatives</h3>
                    <p style={{ fontSize: '0.9rem' }}>Looking for a swap? Check out these certified options:</p>
                    <ul style={{ paddingLeft: '1.2rem', color: 'var(--primary)' }}>
                      <li><a href="#" style={{ color: 'inherit' }}>Vegan/Halal Gummy Bears (Affiliate)</a></li>
                      <li><a href="#" style={{ color: 'inherit' }}>Plant-based Dessert Mix (Affiliate)</a></li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="results-section">
            {savedItems.length > 0 ? (
              savedItems.map((item, i) => (
                <div key={i} className={`ingredient-item ${item.products.risk_level}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{item.products.name}</h3>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Saved on: {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`risk-badge ${item.products.risk_level}`}>
                      {item.products.risk_level}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="input-section" style={{ textAlign: 'center' }}>
                <p>You haven't saved any products yet.</p>
                <button className="btn-check" onClick={() => setView('home')}>Start Scanning</button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer>
        <p>&copy; 2025 HalalCheck - Informational only. Verify with authorities.</p>
      </footer>
    </div>
  );
}

export default App;
