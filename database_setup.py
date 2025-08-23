import json
import sqlite3

def create_database():
    """
    Reads data from JSON files and creates a SQLite database.
    """
    # Connect to (or create) the SQLite database
    conn = sqlite3.connect('japanese_words.db')
    cursor = conn.cursor()

    # Create words table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL UNIQUE
        )
    ''')

    # Create kanji table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS kanji (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kanji TEXT NOT NULL UNIQUE,
            meaning TEXT,
            rtk TEXT
        )
    ''')

    # Load and insert word data
    try:
        with open('word_list.json', 'r', encoding='utf-8') as f:
            word_list = json.load(f)
        
        for word in word_list:
            try:
                cursor.execute("INSERT INTO words (word) VALUES (?)", (word,))
            except sqlite3.IntegrityError:
                # Ignore duplicate words
                pass
        print(f"Successfully inserted {len(word_list)} words.")

    except FileNotFoundError:
        print("Error: word_list.json not found.")
    except json.JSONDecodeError:
        print("Error: Could not decode word_list.json.")

    # Load and insert kanji data
    try:
        with open('kanji_meanings.json', 'r', encoding='utf-8') as f:
            kanji_data = json.load(f)

        for item in kanji_data:
            try:
                cursor.execute("INSERT INTO kanji (kanji, meaning, rtk) VALUES (?, ?, ?)", 
                               (item.get('kanji'), item.get('meaning'), item.get('rtk')))
            except sqlite3.IntegrityError:
                # Ignore duplicate kanji
                pass
        print(f"Successfully inserted {len(kanji_data)} kanji meanings.")

    except FileNotFoundError:
        print("Error: kanji_meanings.json not found.")
    except json.JSONDecodeError:
        print("Error: Could not decode kanji_meanings.json.")

    # Commit changes and close the connection
    conn.commit()
    conn.close()
    print("Database 'japanese_words.db' created and populated successfully.")

if __name__ == '__main__':
    create_database()