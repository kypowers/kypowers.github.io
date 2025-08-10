# Ancient Owl Naturals - Product Scraper

This project contains a Python-based web scraper designed to monitor
the [Ancient Owl Naturals](https://www.ancientowlnaturals.com/) website for new products. It runs automatically once a
day, identifies any newly listed items, saves them to a CSV file, and sends a push notification via Pushover.

## Features

- **Category Discovery**: Automatically finds all product category pages from the main navigation menu.
- **Product Scraping**: Extracts key details for each product: name, price, URL, and sold-out status.
- **New Product Detection**: Intelligently tracks previously seen products and only reports on items that are genuinely
  new.
- **Data Export**: Saves all newly found products to a clean `new_products.csv` file.
- **Push Notifications**: Sends an instant notification to your device using Pushover when new products are found.
- **Scheduled Automation**: Uses GitHub Actions to run the scraper automatically every day at 8:00 AM UTC.

## How It Works

1. **Fetch Categories**: The scraper starts at the homepage and finds all links to product collections (e.g., "
   Products", "Crystals").
2. **Scrape Products**: It visits each category page and extracts the details for every product listed.
3. **Compare and Identify**: The scraper loads a history of seen products from `seen_products_hashes.json`. It creates a
   unique hash for each scraped product's URL and compares it against the history.
4. **Save and Notify**: If any new, unseen products are found:
    - Their details are saved to `new_products.csv`.
    - The history file (`seen_products_hashes.json`) is updated with the new product hashes.
    - A push notification is sent via Pushover.
5. If no new products are found, the script exits quietly.

## Setup and Usage

### Prerequisites

- Python 3.8+
- Git
- A Pushover account (to receive notifications).

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/kypowers/kypowers.github.io.git
   cd kypowers.github.io/scrapers/ancient_owls
   ```

2. **Create and activate a virtual environment:**
   ```sh
   # For macOS/Linux
   python3 -m venv venv
   source venv/bin/activate

   # For Windows
   python -m venv venv
   venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```sh
   pip install -r requirements.txt
   ```

### Configuration for Local Use

To receive push notifications when running the script locally, you need to set your Pushover credentials as environment
variables.

1. Get your **User Key** from your Pushover dashboard.
2. Create a new application on Pushover to get an **API Token/Key**.

Set the following environment variables in your terminal:

```sh
# For macOS/Linux
export USER_TOKEN="your_pushover_user_token"
export APP_TOKEN="your_pushover_application_token"

# For Windows
set USER_TOKEN="your_pushover_user_token"
set APP_TOKEN="your_pushover_application_token"
```

### Running Manually

With your virtual environment activated and environment variables set, you can run the scraper with:

```sh
python ancient_owls_scraper.py
```

## Automation with GitHub Actions

This project is configured to run automatically using GitHub Actions. The workflow is defined in
`.github/workflows/scraper_schedule.yml`.

- **Schedule**: The scraper runs once every day at 8:00 AM UTC.
- **Notifications**: To enable notifications for the automated runs, you must add your Pushover credentials to your
  GitHub repository's secrets.
    1. In your GitHub repository, go to `Settings` > `Secrets and variables` > `Actions`.
    2. Click `New repository secret`.
    3. Create a secret named `USER_TOKEN` with your Pushover User Key.
    4. Create another secret named `APP_TOKEN` with your Pushover Application Token.

The workflow will automatically use these secrets to send notifications.

## Project Files

- `ancient_owls_scraper.py`: The main Python script containing all scraping and notification logic.
- `requirements.txt`: A list of the required Python libraries.
- `new_products.csv` (Generated): This file is created when new products are found. It contains the details of the newly
  discovered items.
- `seen_products_hashes.json` (Generated): This file acts as the scraper's memory, storing the unique hashes of all
  products it has ever seen.