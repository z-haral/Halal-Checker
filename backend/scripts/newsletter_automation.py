import os
from supabase import create_client, Client
from datetime import datetime, timedelta

def generate_newsletter_draft():
    """
    Scans Supabase for new high-risk products and generates a newsletter draft.
    """
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Use service role for backend bypass

    if not url or not key:
        print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.")
        return

    supabase: Client = create_client(url, key)

    # 1. Fetch products from the last 7 days with high risk
    one_week_ago = (datetime.now() - timedelta(days=7)).isoformat()
    
    try:
        response = supabase.table("products")\
            .select("name, brand, risk_level, ingredients_text")\
            .eq("risk_level", "high")\
            .gte("last_updated", one_week_ago)\
            .execute()
        
        products = response.data
    except Exception as e:
        print(f"Error fetching products: {e}")
        return

    # 2. Build the Newsletter Content
    header = f"🌙 HalalCheck Weekly Alert - {datetime.now().strftime('%B %d, %Y')}\n"
    divider = "="*40 + "\n"
    
    if not products:
        content = "No new high-risk products were flagged this week. Alhamdulillah!\n"
    else:
        content = f"We detected {len(products)} new high-risk items this week. Please be cautious:\n\n"
        for p in products:
            content += f"⚠️ {p['name']} ({p.get('brand', 'Unknown Brand')})\n"
            content += f"   Risk Level: {p['risk_level'].upper()}\n"
            content += f"   Reason: Found suspicious ingredients in list.\n\n"

    footer = "\nStay safe and always check your labels.\nPowered by HalalCheck AI."
    
    newsletter = header + divider + content + footer
    
    # 3. Save to a file (or this could be hooked to an Email API like SendGrid/Resend)
    filename = f"newsletter_{datetime.now().strftime('%Y%m%d')}.txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(newsletter)
    
    print(f"Newsletter draft generated: {filename}")
    print(newsletter)

if __name__ == "__main__":
    # For local testing, ensure env vars are set or mock them
    generate_newsletter_draft()
