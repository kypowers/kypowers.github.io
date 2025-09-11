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
        price = ' '.join(price_tag.get_text(separator=" ", strip=True).split()) if price_tag else 'N/A'

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


def load_product_database(filename='product_database.json'):
    """Loads the product database from a JSON file."""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}  # Return an empty dict if file doesn't exist or is empty/corrupt


def save_product_database(database, filename='product_database.json'):
    """Saves the product database to a JSON file."""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(database, f, indent=2)
    print(f"Updated product database saved to {filename}")


def send_pushover_notification(title, products):
    """Sends a formatted push notification using Pushover."""
    import http.client
    import urllib.parse

    app_token = os.getenv('APP_TOKEN')
    user_token = os.getenv('USER_TOKEN')

    if not all([app_token, user_token]):
        print("\nPushover credentials not set. Skipping notification.")
        print("Please set APP_TOKEN and USER_TOKEN secrets in your repository.")
        return

    message_lines = [f"- {p['name']} ({p['price']})" for p in products]
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
    PRODUCT_DATABASE_FILE = 'product_database.json'
    NEW_PRODUCTS_FILE = 'new_products.csv'

    base_url = 'https://www.ancientowlnaturals.com/'

    # Step 1: Get all the product category links from the main page.
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
        # If no products are found, the database should be empty.
        save_product_database({}, PRODUCT_DATABASE_FILE)
        return

    # Step 3: Identify new and restocked products by comparing with the database
    previous_db = load_product_database(PRODUCT_DATABASE_FILE)
    current_db = {}
    newly_found_products = []
    restocked_products = []

    for product in all_products:
        # A product's URL is a great unique identifier
        product_hash = hashlib.sha256(product['url'].encode('utf-8')).hexdigest()

        # Add current product state to the new database for saving later
        current_db[product_hash] = {
            'name': product['name'],
            'url': product['url'],
            'sold_out': product['sold_out']
        }

        previous_product_state = previous_db.get(product_hash)

        if not previous_product_state:
            # New product
            newly_found_products.append(product)
        else:
            # Existing product, check for restock
            if previous_product_state.get('sold_out') == "Yes" and product.get('sold_out') == "No":
                restocked_products.append(product)

    # Step 4: Report, notify, and save
    if newly_found_products:
        print(f"\nFound {len(newly_found_products)} new product(s)!")
        save_to_csv(newly_found_products, filename=NEW_PRODUCTS_FILE)
        title = f"Scraper: Found {len(newly_found_products)} New Product(s)!"
        send_pushover_notification(title, newly_found_products)

    if restocked_products:
        print(f"\nFound {len(restocked_products)} restocked product(s)!")
        title = f"Scraper: {len(restocked_products)} Product(s) Back in Stock!"
        send_pushover_notification(title, restocked_products)

    if not newly_found_products and not restocked_products:
        print("\nScraping complete. No new or restocked products found since the last run.")

    # Save the current state of all found products as the new database
    save_product_database(current_db, PRODUCT_DATABASE_FILE)


if __name__ == '__main__':
    main()
