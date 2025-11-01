# ==============================================================
# FILE: file_manager_backend.py
# PURPOSE: Backend for File Manager viewer
# - Sends file data as Base64 to JS
# - Handles Add, Rename, Delete, Change Folder
# ==============================================================

import os, sys, json, shutil, base64, platform, subprocess
from pathlib import Path

try:
    from PySide6.QtWidgets import QApplication, QFileDialog
    from PySide6.QtWebEngineWidgets import QWebEngineView
    from PySide6.QtWebEngineCore import QWebEngineSettings
    from PySide6.QtWebChannel import QWebChannel
    from PySide6.QtCore import QObject, Slot, Signal, QUrl
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PySide6", "PySide6-QtWebEngine"])
    from PySide6.QtWidgets import QApplication, QFileDialog
    from PySide6.QtWebEngineWidgets import QWebEngineView
    from PySide6.QtWebEngineCore import QWebEngineSettings
    from PySide6.QtWebChannel import QWebChannel
    from PySide6.QtCore import QObject, Slot, Signal, QUrl

CONFIG_FILE = "file_manager_config.json"
DEFAULT_PATH = r"D:\My_Programs\ClearView\Personal_Docs"

class Backend(QObject):
    updateFolders = Signal(list)
    updateFiles = Signal(list)
    showMessage = Signal(str)
    rootPathChanged = Signal(str)

    def __init__(self):
        super().__init__()
        self.root_path = self.load_config()
        Path(self.root_path).mkdir(parents=True, exist_ok=True)
        self.rootPathChanged.emit(self.root_path)

    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            return json.load(open(CONFIG_FILE)).get("root_path", DEFAULT_PATH)
        json.dump({"root_path": DEFAULT_PATH}, open(CONFIG_FILE, "w"))
        return DEFAULT_PATH

    @Slot(result=str)
    def get_root_path(self):
        return self.root_path

    @Slot()
    def list_folders(self):
        try:
            folders = sorted([f.name for f in Path(self.root_path).iterdir() if f.is_dir()])
            self.updateFolders.emit(folders)
        except Exception as e:
            self.showMessage.emit(str(e))

    @Slot(str)
    def list_files(self, folder):
        try:
            p = Path(self.root_path)/folder
            files = [[f.name, f.suffix.upper().replace(".","")] for f in p.iterdir() if f.is_file()]
            self.updateFiles.emit(files)
        except Exception as e:
            self.showMessage.emit(str(e))

    @Slot(str)
    def open_file(self, path):
        try:
            if platform.system()=="Windows": os.startfile(path)
            elif platform.system()=="Darwin": subprocess.run(["open",path])
            else: subprocess.run(["xdg-open",path])
        except Exception as e: self.showMessage.emit(str(e))

    @Slot(str,str,str)
    def rename_file(self, folder, old, new):
        try:
            (Path(self.root_path)/folder/old).rename(Path(self.root_path)/folder/new)
            self.list_files(folder)
        except Exception as e: self.showMessage.emit(str(e))

    @Slot(str,str)
    def delete_file(self, folder, name):
        try:
            (Path(self.root_path)/folder/name).unlink(missing_ok=True)
            self.list_files(folder)
        except Exception as e: self.showMessage.emit(str(e))

    @Slot(str)
    def add_file(self, folder):
        try:
            if not folder:
                self.showMessage.emit("Select a category first.")
                return
            dlg = QFileDialog(); dlg.setFileMode(QFileDialog.ExistingFile)
            if dlg.exec():
                f = dlg.selectedFiles()[0]
                shutil.copy(f, Path(self.root_path)/folder)
                self.list_files(folder)
        except Exception as e: self.showMessage.emit(str(e))

    @Slot()
    def change_folder(self):
        dlg = QFileDialog(); dlg.setFileMode(QFileDialog.Directory)
        if dlg.exec():
            folder = dlg.selectedFiles()[0]
            json.dump({"root_path": folder}, open(CONFIG_FILE, "w"))
            self.root_path = folder
            self.rootPathChanged.emit(folder)
            self.list_folders()

    @Slot(str, result=str)
    def read_file_binary(self, filepath):
        """Return Base64-encoded content."""
        try:
            with open(filepath, "rb") as f:
                return base64.b64encode(f.read()).decode("utf-8")
        except Exception:
            return ""

app = QApplication(sys.argv)
view = QWebEngineView()
channel = QWebChannel()
backend = Backend()
channel.registerObject("backend", backend)
view.page().setWebChannel(channel)

s = view.settings()
s.setAttribute(QWebEngineSettings.LocalContentCanAccessFileUrls, True)
s.setAttribute(QWebEngineSettings.PluginsEnabled, True)
view.page().profile().settings().setAttribute(QWebEngineSettings.PdfViewerEnabled, True)

view.load(QUrl.fromLocalFile(os.path.abspath("file_manager_viewer.html")))
view.resize(1600,900)
view.show()
backend.list_folders()
sys.exit(app.exec())

