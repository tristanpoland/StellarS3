# StellarS3

A modern, sleek file manager for S3-compatible storage with an AMOLED black theme. Built with Tauri v2, React, and Rust.

## Features

### 🌟 **Universal S3 Compatibility**
- **Amazon S3** - Native AWS S3 support
- **MinIO** - Self-hosted object storage
- **DigitalOcean Spaces** - Scalable cloud storage
- **Wasabi** - Hot cloud storage
- **Backblaze B2** - Affordable cloud storage
- **Custom S3 Compatible** - Any S3-compatible service

### 🎨 **AMOLED Black Theme**
- Pure black background for OLED displays
- Cyan accent colors for modern aesthetics
- Smooth animations and transitions
- Eye-friendly dark interface

### 📁 **Complete File Management**
- **Browse** - Navigate buckets and folders
- **Upload** - Drag & drop or click to upload
- **Download** - Direct downloads with presigned URLs
- **Delete** - Remove files and folders
- **Preview** - View files directly in browser
- **Search** - Find files quickly
- **Multiple Views** - Grid and list layouts

### 🔗 **Connection Management**
- Multiple connection profiles
- Secure credential storage
- Connection testing
- Provider-specific presets
- SSL/TLS support
- Path-style URL support

### ⚡ **Performance**
- Rust backend for speed
- Async operations
- Progress indicators
- Error handling
- Toast notifications

## Prerequisites

- **Node.js** (v18 or later)
- **Rust** (latest stable)
- **Tauri CLI** v2.0

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/StellarS3.git
   cd StellarS3
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Tauri CLI**
   ```bash
   npm install -g @tauri-apps/cli@next
   ```

## Development

1. **Start development server**
   ```bash
   npm run tauri dev
   ```

2. **Build for production**
   ```bash
   npm run tauri build
   ```

## Configuration

### Supported S3 Providers

#### Amazon S3
- **Endpoint**: `s3.amazonaws.com`
- **Region**: Your AWS region (e.g., `us-east-1`)
- **SSL**: Enabled
- **Path Style**: Disabled

#### MinIO
- **Endpoint**: Your MinIO server (e.g., `localhost:9000`)
- **Region**: `us-east-1` (or your configured region)
- **SSL**: Based on your setup
- **Path Style**: Enabled

#### DigitalOcean Spaces
- **Endpoint**: `nyc3.digitaloceanspaces.com` (replace with your region)
- **Region**: `us-east-1`
- **SSL**: Enabled
- **Path Style**: Disabled

#### Wasabi
- **Endpoint**: `s3.wasabisys.com` (or your region-specific endpoint)
- **Region**: `us-east-1`
- **SSL**: Enabled
- **Path Style**: Disabled

#### Backblaze B2
- **Endpoint**: `s3.us-west-002.backblazeb2.com` (replace with your region)
- **Region**: Your B2 region
- **SSL**: Enabled
- **Path Style**: Disabled

## Usage

### Adding a Connection
1. Launch StellarS3
2. Click "Add Connection"
3. Select your provider type
4. Enter your credentials:
   - **Access Key** - Your S3 access key
   - **Secret Key** - Your S3 secret key
   - **Endpoint** - S3 endpoint URL
   - **Region** - S3 region
5. Configure SSL and path-style options
6. Test the connection
7. Save the connection

### File Operations
- **Upload**: Drag files into the window or click Upload
- **Download**: Right-click file → Download or double-click to preview
- **Delete**: Right-click file → Delete
- **Navigate**: Click folders to browse
- **Search**: Use the search bar to find files
- **Switch Views**: Toggle between grid and list views

### Keyboard Shortcuts
- `Ctrl+U` - Upload files
- `Ctrl+R` - Refresh current view
- `Ctrl+F` - Focus search
- `Delete` - Delete selected files
- `F5` - Refresh
- `Escape` - Clear selection

## Architecture

### Backend (Rust)
- **Tauri v2** - Desktop app framework
- **AWS SDK for Rust** - S3 operations
- **Tokio** - Async runtime
- **Serde** - Serialization

### Frontend (React)
- **React 18** - UI framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Framer Motion** - Animations
- **Lucide React** - Icons

## Security

- Credentials stored locally using Tauri's secure storage
- HTTPS/SSL support for all connections
- No credentials sent to external services
- Local-only application, no data collection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Tauri team for the excellent framework
- AWS SDK for Rust team
- All S3-compatible storage providers
- Open source community

---

**StellarS3** - Your gateway to the stars of cloud storage ⭐