import requests
import json
import os
from typing import List, Dict

OFF_API_URL = "https://world.openfoodfacts.org/cgi/search.pl"

def fetch_products(category: str, page_size: int = 50) -> List[Dict]:
    """Fetches products from Open Food Facts by category."""
    params = {
        'action': 'process',
        'tagtype_0': 'categories',
        'tag_contains_0': 'contains',
        'tag_0': category,
        'json': 'true',
        'page_size': page_size,
        'fields': 'code,product_name,brands,ingredients_text,labels_tags'
    }
    
    try:
        response = requests.get(OFF_API_URL, params=params)
        response.raise_for_status()
        data = response.json()
        return data.get('products', [])
    except Exception as e:
        print(f"Error fetching products: {e}")
        return []

def normalize_product(product: Dict) -> Dict:
    """Normalizes the product data for our database schema."""
    return {
        'off_id': product.get('code'),
        'name': product.get('product_name', 'Unknown Product'),
        'brand': product.get('brands', 'Unknown Brand'),
        'ingredients_text': product.get('ingredients_text', ''),
        'labels': product.get('labels_tags', [])
    }

if __name__ == "__main__":
    # Example usage
    categories = ['snacks', 'confectionery', 'beverages']
    all_products = []
    
    for cat in categories:
        print(f"Fetching {cat}...")
        products = fetch_products(cat)
        normalized = [normalize_product(p) for p in products]
        all_products.extend(normalized)
    
    # In a real scenario, this would push to Supabase
    # For now, we save to a JSON for verification
    with open('off_ingestion_sample.json', 'w') as f:
        json.dump(all_products, f, indent=2)
    
    print(f"Successfully ingested {len(all_products)} products to off_ingestion_sample.json")
