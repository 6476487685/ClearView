#!/usr/bin/env python3
"""
Simple File Server for Manage Accounts
Serves files from the Personal_Docs folder for preview and download
"""

import http.server
import socketserver
import os
import json
import mimetypes
from urllib.parse import unquote
import webbrowser
import threading
import time

# Configuration
FOLDER_PATH = r"D:\My_Programs\ClearView\Personal_Docs"
PORT = 8080
HOST = "localhost"

class FileHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FOLDER_PATH, **kwargs)
    
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(self.get_file_listing().encode())
        elif self.path == '/api/files':
            self.send_file_list()
        elif self.path.startswith('/api/file/'):
            self.send_file_content()
        else:
            super().do_GET()
    
    def send_file_list(self):
        """Send JSON list of files and folders"""
        try:
            files = []
            folders = []
            
            for item in os.listdir(FOLDER_PATH):
                item_path = os.path.join(FOLDER_PATH, item)
                if os.path.isdir(item_path):
                    # Count files in subfolder
                    file_count = len([f for f in os.listdir(item_path) if os.path.isfile(os.path.join(item_path, f))])
                    folders.append({
                        'name': item,
                        'type': 'folder',
                        'file_count': file_count
                    })
                else:
                    file_ext = os.path.splitext(item)[1].lower()
                    file_type = self.get_file_type(file_ext)
                    files.append({
                        'name': item,
                        'type': file_type,
                        'size': os.path.getsize(item_path),
                        'category': 'Root'
                    })
            
            # Get files from subfolders
            for folder in folders:
                folder_path = os.path.join(FOLDER_PATH, folder['name'])
                for item in os.listdir(folder_path):
                    item_path = os.path.join(folder_path, item)
                    if os.path.isfile(item_path):
                        file_ext = os.path.splitext(item)[1].lower()
                        file_type = self.get_file_type(file_ext)
                        files.append({
                            'name': item,
                            'type': file_type,
                            'size': os.path.getsize(item_path),
                            'category': folder['name']
                        })
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'folders': folders,
                'files': files
            }).encode())
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def send_file_content(self):
        """Send file content for preview"""
        try:
            file_path = unquote(self.path[10:])  # Remove '/api/file/'
            full_path = os.path.join(FOLDER_PATH, file_path)
            
            if not os.path.exists(full_path) or not os.path.isfile(full_path):
                self.send_error(404, "File not found")
                return
            
            # Get file info
            file_ext = os.path.splitext(full_path)[1].lower()
            mime_type, _ = mimetypes.guess_type(full_path)
            
            if mime_type is None:
                mime_type = 'application/octet-stream'
            
            # Send file
            with open(full_path, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', mime_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content)
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def get_file_type(self, ext):
        """Get file type from extension"""
        type_map = {
            '.pdf': 'PDF',
            '.jpg': 'JPG',
            '.jpeg': 'JPG',
            '.png': 'PNG',
            '.gif': 'GIF',
            '.xlsx': 'XLSX',
            '.xls': 'XLS',
            '.docx': 'DOCX',
            '.doc': 'DOC',
            '.txt': 'TXT',
            '.md': 'MD'
        }
        return type_map.get(ext, 'FILE')
    
    def get_file_listing(self):
        """Get HTML file listing"""
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>File Server</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .file { padding: 5px; border-bottom: 1px solid #eee; }
                .folder { font-weight: bold; color: #0066cc; }
            </style>
        </head>
        <body>
            <h1>File Server Running</h1>
            <p>Server is running on http://localhost:8080</p>
            <p>Files are being served from: """ + FOLDER_PATH + """</p>
            <p>Use the Manage Accounts interface to access files.</p>
        </body>
        </html>
        """

def start_server():
    """Start the file server"""
    try:
        with socketserver.TCPServer((HOST, PORT), FileHandler) as httpd:
            print(f"File server running on http://{HOST}:{PORT}")
            print(f"Serving files from: {FOLDER_PATH}")
            print("Press Ctrl+C to stop the server")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except Exception as e:
        print(f"Error starting server: {e}")

if __name__ == "__main__":
    # Check if folder exists
    if not os.path.exists(FOLDER_PATH):
        print(f"Error: Folder {FOLDER_PATH} does not exist!")
        print("Please update the FOLDER_PATH in this script to point to your files.")
        input("Press Enter to exit...")
        exit(1)
    
    start_server()
