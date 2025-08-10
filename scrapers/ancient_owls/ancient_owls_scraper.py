import csv
import hashlib
import json
import os
import time
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


def get_category_links(url):
    """
    Scrapes the main navigation menu to find links to product categories.
    """
    print(f"Fetching main page to find category links: {url}")
    # Set a User-Agent to mimic a real browser visit
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        # Raise an exception for bad status codes (e.g., 404, 500)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL {url}: {e}")
        return []

    soup = BeautifulSoup(response.content, 'html.parser')

    category_links = []
    # This CSS selector finds all <a> tags that are direct children of <li> tags,
    # which are themselves inside a <ul> with the id 'nav'.
    # This is a very precise way to get the main navigation links.
    link_elements = soup.select('ul#nav > li > a')

    # Interested in the first two links specifically
    # which are 'Products' and 'Crystals'. We can grab all relevant ones.
    for link_tag in link_elements:
        # We only want links that point to collections
        href = link_tag.get('href')
        if href and '/collections/' in href:
            full_url = urljoin(url, href)
            category_links.append({
                'name': link_tag.get_text(strip=True),
                'url': full_url
            })

    return category_links


def scrape_products_from_category(category_url):
    """
    Scrapes all products from a given category page.
    Handles product name, price, URL, and sold-out status.
    """
    # Set a User-Agent to mimic a real browser visit
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        response = requests.get(category_url, headers=headers, timeout=10)
        # Raise an exception for bad status codes (e.g., 404, 500)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL {category_url}: {e}")
        return []

    soup = BeautifulSoup(response.content, 'html.parser')

    products_data = []
    # Find the list containing all the products
    product_list = soup.find('ul', id='product-loop')
    if not product_list:
        print(f"Warning: Could not find product list on {category_url}")
        return []

    # Find all list items with the class 'product' inside that list
    product_items = product_list.find_all('li', class_='product')

    for item in product_items:
        name_tag = item.find('h3')
        name = name_tag.get_text(strip=True) if name_tag else 'N/A'

        link_tag = item.find('a')
        product_url = urljoin(category_url, link_tag['href']) if link_tag and link_tag.has_attr('href') else 'N/A'

        price_tag = item.find('div', class_='price')
        # Clean up price text, which can be complex (e.g., "From $40.00 - $45.00")
        price = ' '.join(price_tag.get_text(strip=True, separator=' ').split()) if price_tag else 'N/A'

        # Check if the "Sold Out" div exists
        is_sold_out = "Yes" if item.find('div', class_='so') else "No"

        products_data.append({
            'name': name,
            'price': price,
            'url': product_url,
            'sold_out': is_sold_out,
            'category': category_url.split('/')[-1]  # Add category context
        })

    return products_data


def save_to_csv(data, filename='new_products.csv'):
    """
    Saves the scraped data to a CSV file.
    """
    if not data:
        print("No data to save.")
        return

    # Use the keys from the first dictionary as CSV headers
    fieldnames = data[0].keys()

    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    print(f"Data successfully saved to {filename}")


def load_seen_hashes(filename='seen_products_hashes.json'):
    """Loads a set of previously seen quote hashes from a JSON file."""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return set(json.load(f))
    except FileNotFoundError:
        return set()  # Return an empty set if the file doesn't exist yet


def save_seen_hashes(hashes, filename='seen_products_hashes.json'):
    """Saves a set of quote hashes to a JSON file."""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(list(hashes), f, indent=2)
    print(f"Updated hashes saved to {filename}")


def send_pushover_notification(new_products):
    """Sends a formatted push notification using Pushover."""
    import http.client
    import urllib.parse

    app_token = os.getenv('APP_TOKEN')
    user_token = os.getenv('USER_TOKEN')

    if not all([app_token, user_token]):
        print("\nPushover credentials not set. Skipping notification.")
        print("Please set APP_TOKEN and USER_TOKEN secrets in your repository.")
        return

    product_count = len(new_products)
    title = f"Scraper: Found {product_count} New Product(s)!"
    message_lines = [f"- {p['name']} ({p['price']})" for p in new_products]
    message_body = "\n".join(message_lines)

    try:
        conn = http.client.HTTPSConnection("api.pushover.net:443")
        conn.request("POST", "/1/messages.json",
                     urllib.parse.urlencode({
                         "token": app_token,
                         "user": user_token,
                         "title": title,
                         "message": message_body,
                     }), {"Content-type": "application/x-www-form-urlencoded"})

        response = conn.getresponse()
        if 200 <= response.status < 300:
            print("\nPushover notification sent successfully!")
        else:
            print(f"\nFailed to send Pushover notification: {response.status} {response.reason}")
            print(f"Response body: {response.read().decode()}")
    except Exception as e:
        print(f"\nAn error occurred while sending Pushover notification: {e}")


def main():
    """
    Main function to run the scraper.
    """
    SEEN_HASHES_FILE = 'seen_products_hashes.json'
    NEW_PRODUCTS_FILE = 'new_products.csv'

    base_url = 'https://www.ancientowlnaturals.com/'

    # Step 1: Get all the product category links from the main page.
    # This corresponds to the lines you were interested in.
    categories = get_category_links(base_url)

    if not categories:
        print("Could not find any category links. Exiting.")
        return

    print("\nFound the following product categories to scrape:")
    for category in categories:
        print(f"- {category['name']}: {category['url']}")

    # Step 2: Scrape all products from each category
    all_products = []
    for category in categories:
        print(f"\n--- Scraping products from {category['name']} ---")
        products_on_page = scrape_products_from_category(category['url'])
        all_products.extend(products_on_page)
        time.sleep(1)  # Be polite between requests

    if not all_products:
        print("Scraping complete, but no products were found.")
        return

    # Step 3: Identify new products by comparing hashes
    seen_hashes = load_seen_hashes(SEEN_HASHES_FILE)
    newly_found_products = []

    for product in all_products:
        # A product's URL is a great unique identifier
        product_hash = hashlib.sha256(product['url'].encode('utf-8')).hexdigest()

        if product_hash not in seen_hashes:
            newly_found_products.append(product)
            seen_hashes.add(product_hash)

    # Step 4: Save new products and update seen hashes
    if newly_found_products:
        print(f"\nFound {len(newly_found_products)} new product(s)!")
        save_to_csv(newly_found_products, filename=NEW_PRODUCTS_FILE)
        save_seen_hashes(seen_hashes, SEEN_HASHES_FILE)
        send_pushover_notification(newly_found_products)
    else:
        print("\nScraping complete. No new products found since the last run.")


if __name__ == '__main__':
    main()
