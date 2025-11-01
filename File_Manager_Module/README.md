# File Manager Module

## Overview
This module provides a comprehensive file management system for organizing and accessing personal documents and files.

## Files Structure

### Core Files
- **File_Manager_FileManager.html** - Main file manager interface
- **File_Manager_Backend.py** - Python backend for file operations
- **File_Manager_Config.json** - Configuration settings
- **File_Manager_Viewer.js** - JavaScript viewer functionality

## Features

### File Manager Interface
- **Clean, modern UI** with three-panel layout
- **Left Sidebar**: Folder categories and navigation
- **Center Panel**: File list with actions (Preview, Rename, Delete)
- **Right Panel**: File preview with Download/Print options

### File Operations
- **Real File Access**: Uses File System Access API for secure file handling
- **File Preview**: Supports PDF, images, text files, and office documents
- **File Management**: Rename, delete, and organize files
- **Persistent Storage**: Remembers selected folder path

### Default Configuration
- **Target Folder**: `D:\Personal_Docs`
- **Supported File Types**: PDF, JPG, PNG, GIF, DOCX, XLSX, TXT, MD
- **Browser Compatibility**: Chrome, Edge, Opera (File System Access API)

## Usage

### Direct Access
1. Open `File_Manager_FileManager.html` directly in browser
2. Click "Change Folder" to select your documents folder
3. Navigate to `D:\Personal_Docs` (or your preferred folder)
4. Select the folder to load files

### Through Main Application
1. Launch the main ClearView application
2. Click "View and Manage Personal Documents" button
3. Follow the same folder selection process

## Technical Details

### File System Access
- Uses modern File System Access API
- Requires user permission for folder access
- Secure file handling with browser security model

### Layout Specifications
- **Left Sidebar**: 240px (2.5 inches) for folder categories
- **Center Panel**: 600px (6-7 inches) for file list
- **Right Panel**: Remaining space for file preview
- **Equal Gaps**: 8px spacing between panels

### Browser Requirements
- Chrome 86+ or Edge 86+ recommended
- File System Access API support required
- Local file access permissions

## Configuration

### Default Path
The system is configured to work with `D:\Personal_Docs` as the default folder path. This can be changed by modifying the `DEFAULT_PATH` constant in the HTML file.

### File Categories
Files are automatically categorized into:
- **All Files**: Complete file list
- **Work**: Work-related documents
- **Personal**: Personal documents
- **Utilities**: Utility bills and documents
- **Training**: Training materials
- **Misc**: Miscellaneous files

## Security
- All file operations require explicit user permission
- No automatic file access without user consent
- Secure file preview using browser's object URL system
- No server-side file storage or processing

## Version History
- **v1.0**: Initial release with basic file management
- **v2.0**: Added real file preview functionality
- **v3.0**: Simplified interface with persistent storage
- **v4.0**: Clean, working version with proper file access

## Support
For issues or questions, refer to the main ClearView application documentation.

