# Japanese Word Learning App

A web-based Japanese language learning application that helps users discover random Japanese words with kanji breakdown, meanings, and example sentences. The application uses SQLite database for efficient data storage and retrieval.

## Features

- **Random Word Generation**: Get random Japanese words from an extensive database
- **Kanji Breakdown**: Detailed information about each kanji character including meanings and RTK (Remembering the Kanji) mnemonics
- **Word Details**: Comprehensive word information via Jisho API integration
- **Audio Examples**: Listen to pronunciation examples through Immersion Kit integration
- **Modern UI**: Clean, responsive interface with smooth animations
- **SQLite Database**: Efficient local data storage for fast word and kanji retrieval

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: SQLite
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **External APIs**: 
  - Jisho API (for word definitions)
  - Immersion Kit API (for audio examples)

## Prerequisites

- Node.js (version 14 or higher)
- npm (Node Package Manager)

## Installation

1. **Clone or download the repository**
   ```bash
   git clone <repository-url>
   cd random-word
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database** (if not already created)
   ```bash
   python database_setup.py
   ```
   This will create `japanese_words.db` from the JSON data files.

## Database Setup

The application includes a Python script to populate the SQLite database:

- `word_list.json` → `words` table
- `kanji_meanings.json` → `kanji` table

### Database Schema

**words table:**
- `id` (INTEGER PRIMARY KEY)
- `word` (TEXT UNIQUE)

**kanji table:**
- `id` (INTEGER PRIMARY KEY)
- `kanji` (TEXT UNIQUE)
- `meaning` (TEXT)
- `rtk` (TEXT)

## Usage

### Starting the Application

1. **Development mode** (with auto-restart):
   ```bash
   npm run dev
   ```

2. **Production mode**:
   ```bash
   npm start
   ```

The application will be available at: `http://localhost:7000/mokuro/visual_novel/`

### API Endpoints

The application provides several REST API endpoints:

#### Word Endpoints
- `GET /api/words` - Retrieve all words from the database
- `GET /api/random-word` - Get a single random word

#### Kanji Endpoints
- `GET /api/kanji` - Retrieve all kanji with meanings and RTK data
- `GET /api/kanji/:kanji` - Get specific kanji information

#### External API Proxies
- `GET /api/jisho?keyword=<word>` - Proxy to Jisho API for word definitions
- `GET /api/immersion-kit?targetUrl=<url>` - Proxy to Immersion Kit API for audio

### Example API Usage

```bash
# Get all words
curl http://localhost:7000/api/words

# Get random word
curl http://localhost:7000/api/random-word

# Get kanji information
curl http://localhost:7000/api/kanji/水

# Search word definition
curl "http://localhost:7000/api/jisho?keyword=水"
```

## File Structure

```
.
├── server.js              # Express server with API endpoints
├── index.html             # Main application frontend
├── package.json           # Node.js dependencies and scripts
├── database_setup.py      # Database initialization script
├── japanese_words.db      # SQLite database (created by setup script)
├── word_list.json         # Source word data (legacy)
├── kanji_meanings.json    # Source kanji data (legacy)
└── README.md             # This file
```

## Development

### Adding New Features

1. **Backend changes**: Modify `server.js` to add new API endpoints
2. **Frontend changes**: Update `index.html` for UI modifications
3. **Database changes**: Update `database_setup.py` and regenerate the database

### Configuration

- **Port**: Change the `PORT` environment variable or modify `server.js`
- **Database**: Modify database connection in `server.js`

## Security Considerations

- The application uses parameterized queries to prevent SQL injection
- External API calls are proxied through the server to avoid CORS issues
- User input is validated and sanitized

## Performance

- SQLite provides fast local data access
- Database queries are optimized with appropriate indexing
- Static files are served efficiently via Express

## Troubleshooting

### Common Issues

1. **Database not found**
   - Ensure `japanese_words.db` exists in the project root
   - Run `python database_setup.py` to create the database

2. **Port already in use**
   - Change the port in `server.js` or set `PORT` environment variable
   - Kill existing processes using the port

3. **Missing dependencies**
   - Run `npm install` to ensure all packages are installed

4. **API proxy errors**
   - Check internet connection for external API calls
   - Verify API endpoints are accessible

### Logs

The application logs important events to the console:
- Database connection status
- API errors
- Server startup confirmation

## Migration from JSON Files

The application has been migrated from JSON file-based data storage to SQLite:

- **Before**: Data loaded directly from `word_list.json` and `kanji_meanings.json`
- **After**: Data served via API endpoints from SQLite database
- **Benefits**: Faster queries, better scalability, reduced memory usage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit a pull request with detailed description

## License

This project is intended for educational purposes. Please respect the terms of use for external APIs (Jisho, Immersion Kit).

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review console logs for error messages
3. Ensure all prerequisites are met
4. Verify database setup is complete