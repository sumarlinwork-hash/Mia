import os
import sys
import subprocess
import json
from typing import List, Dict

try:
    import winreg
except ImportError:
    winreg = None

class StudioIDEDiscoveryService:
    def __init__(self):
        # Whitelisted IDE commands and metadata
        self.whitelisted_ides = {
            "vscode": {"name": "VS Code", "exec": "Code.exe", "cli": "code.cmd"},
            "cursor": {"name": "Cursor", "exec": "Cursor.exe", "cli": "cursor.cmd"},
            "trae": {"name": "Trae", "exec": "Trae.exe", "cli": "trae.exe"},
            "qoder": {"name": "Qoder", "exec": "Qoder.exe", "cli": "qoder.exe"},
            "codex": {"name": "Codex", "exec": "Codex.exe", "cli": "codex.exe"},
            "intellij": {"name": "IntelliJ IDEA", "exec": "idea64.exe", "cli": "idea.bat"},
            "pycharm": {"name": "PyCharm", "exec": "pycharm64.exe", "cli": "pycharm.bat"},
            "webstorm": {"name": "WebStorm", "exec": "webstorm64.exe", "cli": "webstorm.bat"},
            "goland": {"name": "GoLand", "exec": "goland64.exe", "cli": "goland.bat"},
            "phpstorm": {"name": "PhpStorm", "exec": "phpstorm64.exe", "cli": "phpstorm.bat"},
            "clion": {"name": "CLion", "exec": "clion64.exe", "cli": "clion.bat"},
        }
        # In-memory cache for discovered IDEs to prevent repeated heavy disk/registry scans
        self._cached_ides = None
        
    def scan_installed_ides(self, force_refresh: bool = False) -> List[Dict[str, str]]:
        if self._cached_ides is not None and not force_refresh:
            return self._cached_ides
            
        discovered = []
        
        # 1. Registry Scanner
        registry_detected = self._scan_windows_registry()
        
        # 2. Start Menu & Desktop Shortcuts (LNK) Scanner
        shortcuts_detected = self._scan_windows_shortcuts()
        
        # 3. JetBrains Toolbox Scanner
        toolbox_detected = self._scan_jetbrains_toolbox()
        
        # 4. Shallow Drive Root Scanner (for portable / custom D:\ paths)
        drive_roots_detected = self._scan_drive_roots_shallow()
        
        # 5. Exhaustive Programs Folder Scanner
        programs_detected = self._scan_programs_folders_exhaustively()
        
        # 6. Standard PATH & Common directories scanner
        path_detected = self._scan_path_and_common_directories()
        
        # Merge all detected, prioritizing registry > shortcuts > toolbox > drive_roots > programs > path
        all_detected = {}
        for d in [path_detected, programs_detected, drive_roots_detected, toolbox_detected, shortcuts_detected, registry_detected]:
            all_detected.update(d)
        
        for key, path in all_detected.items():
            if key in self.whitelisted_ides:
                discovered.append({
                    "id": key,
                    "name": self.whitelisted_ides[key]["name"],
                    "path": path
                })
                
        # If no VS Code is detected, always fallback to the general PATH call
        if not any(d["id"] == "vscode" for d in discovered):
            discovered.append({
                "id": "vscode",
                "name": "VS Code (Fallback)",
                "path": "code"
            })
            
        self._cached_ides = discovered
        return discovered

    def _extract_path_from_value(self, val: str) -> str:
        if not val:
            return ""
        val = val.strip()
        # Strip wrapping quotes
        if val.startswith('"'):
            end_idx = val.find('"', 1)
            if end_idx != -1:
                val = val[1:end_idx]
        else:
            # Strip trailing parameters
            for ext in ['.exe', '.cmd', '.bat', '.lnk']:
                idx = val.lower().find(ext)
                if idx != -1:
                    val = val[:idx + len(ext)]
                    break
        if os.path.isfile(val):
            return os.path.dirname(val)
        elif os.path.isdir(val):
            return val
        return ""

    def _scan_windows_registry(self) -> Dict[str, str]:
        detected = {}
        if not winreg:
            return detected
            
        paths = [
            r"Software\Microsoft\Windows\CurrentVersion\Uninstall",
            r"Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
        ]
        
        for hive in [winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE]:
            for reg_path in paths:
                try:
                    with winreg.OpenKey(hive, reg_path) as key:
                        for i in range(winreg.QueryInfoKey(key)[0]):
                            try:
                                subkey_name = winreg.EnumKey(key, i)
                                with winreg.OpenKey(key, subkey_name) as subkey:
                                    try:
                                        display_name = ""
                                        try:
                                            display_name = winreg.QueryValueEx(subkey, "DisplayName")[0]
                                        except OSError:
                                            pass
                                            
                                        if not display_name:
                                            continue
                                            
                                        display_name_lower = display_name.lower()
                                        for key_id, info in self.whitelisted_ides.items():
                                            if info["name"].lower() in display_name_lower:
                                                install_location = ""
                                                try:
                                                    install_location = winreg.QueryValueEx(subkey, "InstallLocation")[0]
                                                except OSError:
                                                    pass
                                                    
                                                # Fallback: extract path from DisplayIcon or UninstallString
                                                if not install_location:
                                                    for field in ["DisplayIcon", "UninstallString"]:
                                                        try:
                                                            field_val = winreg.QueryValueEx(subkey, field)[0]
                                                            extracted = self._extract_path_from_value(field_val)
                                                            if extracted and os.path.exists(extracted):
                                                                install_location = extracted
                                                                break
                                                        except OSError:
                                                            pass
                                                            
                                                if install_location and os.path.exists(install_location):
                                                    exec_path = os.path.join(install_location, info["exec"])
                                                    if os.path.exists(exec_path):
                                                        detected[key_id] = exec_path
                                                    else:
                                                        cli_path = os.path.join(install_location, "bin", info["cli"])
                                                        if os.path.exists(cli_path):
                                                            detected[key_id] = cli_path
                                                        else:
                                                            detected[key_id] = os.path.join(install_location, info["cli"])
                                    except OSError:
                                        continue
                            except OSError:
                                continue
                except OSError:
                    continue
        return detected

    def _scan_windows_shortcuts(self) -> Dict[str, str]:
        detected = {}
        user_profile = os.environ.get("USERPROFILE", "")
        app_data = os.environ.get("APPDATA", "")
        program_data = os.environ.get("ProgramData", "C:\\ProgramData")
        
        scan_paths = []
        if user_profile:
            scan_paths.append(os.path.join(user_profile, "Desktop"))
            scan_paths.append(os.path.join(user_profile, "OneDrive", "Desktop"))
        scan_paths.append("C:\\Users\\Public\\Desktop")
        if app_data:
            scan_paths.append(os.path.join(app_data, "Microsoft", "Windows", "Start Menu", "Programs"))
        if program_data:
            scan_paths.append(os.path.join(program_data, "Microsoft", "Windows", "Start Menu", "Programs"))
            
        scan_paths = [p for p in scan_paths if os.path.exists(p)]
        if not scan_paths:
            return detected
            
        paths_str = ",".join([f"'{p}'" for p in scan_paths])
        
        ps_cmd = (
            f"$paths = @({paths_str}); "
            "Get-ChildItem -Path $paths -Filter *.lnk -Recurse -ErrorAction SilentlyContinue | "
            "ForEach-Object { "
            "  try { "
            "    $sh = New-Object -ComObject WScript.Shell; "
            "    $target = $sh.CreateShortcut($_.FullName).TargetPath; "
            "    if ($target) { "
            "      [PSCustomObject]@{Name=$_.Name; Target=$target} "
            "    } "
            "  } catch {} "
            "} | ConvertTo-Json"
        )
        
        try:
            output = subprocess.check_output(
                ["powershell", "-NoProfile", "-Command", ps_cmd],
                universal_newlines=True,
                stderr=subprocess.DEVNULL,
                timeout=5.0
            )
            if output.strip():
                data = json.loads(output)
                items = data if isinstance(data, list) else [data]
                for item in items:
                    target = item.get("Target", "")
                    if target and os.path.exists(target):
                        target_lower = target.lower()
                        for key_id, info in self.whitelisted_ides.items():
                            if info["exec"].lower() in target_lower:
                                detected[key_id] = target
        except Exception as e:
            print(f"[IDEDiscovery] Failed to scan shortcuts: {e}")
            
        return detected

    def _scan_jetbrains_toolbox(self) -> Dict[str, str]:
        detected = {}
        local_app_data = os.environ.get("LOCALAPPDATA", "")
        if not local_app_data:
            return detected
            
        toolbox_path = os.path.join(local_app_data, "JetBrains", "Toolbox", "apps")
        if not os.path.exists(toolbox_path):
            return detected
            
        try:
            for app_folder in os.listdir(toolbox_path):
                app_path = os.path.join(toolbox_path, app_folder)
                if not os.path.isdir(app_path):
                    continue
                ch_path = os.path.join(app_path, "ch-0")
                if not os.path.exists(ch_path):
                    continue
                for version_folder in os.listdir(ch_path):
                    version_path = os.path.join(ch_path, version_folder)
                    bin_path = os.path.join(version_path, "bin")
                    if not os.path.exists(bin_path):
                        continue
                    for key_id, info in self.whitelisted_ides.items():
                        exec_file = info["exec"]
                        full_exec = os.path.join(bin_path, exec_file)
                        if os.path.exists(full_exec):
                            detected[key_id] = full_exec
        except Exception as e:
            print(f"[IDEDiscovery] Failed to scan JetBrains Toolbox: {e}")
        return detected

    def _scan_drive_roots_shallow(self) -> Dict[str, str]:
        detected = {}
        search_roots = [
            "C:\\", "D:\\",
            "C:\\Programs", "D:\\Programs",
            "C:\\Tools", "D:\\Tools",
            "C:\\Development", "D:\\Development"
        ]
        
        for root in search_roots:
            if not os.path.exists(root):
                continue
            try:
                for folder in os.listdir(root):
                    folder_path = os.path.join(root, folder)
                    if not os.path.isdir(folder_path):
                        continue
                    for key_id, info in self.whitelisted_ides.items():
                        exec_path = os.path.join(folder_path, info["exec"])
                        if os.path.exists(exec_path):
                            detected[key_id] = exec_path
                            continue
                        if folder.lower() in ["programs", "tools", "ide", "ides", "development"]:
                            try:
                                for subfolder in os.listdir(folder_path):
                                    sub_path = os.path.join(folder_path, subfolder)
                                    if os.path.isdir(sub_path):
                                        sub_exec = os.path.join(sub_path, info["exec"])
                                        if os.path.exists(sub_exec):
                                            detected[key_id] = sub_exec
                                            break
                            except Exception:
                                pass
            except Exception:
                continue
        return detected

    def _scan_programs_folders_exhaustively(self) -> Dict[str, str]:
        detected = {}
        local_app_data = os.environ.get("LOCALAPPDATA", "")
        user_profile = os.environ.get("USERPROFILE", "")
        
        roots = []
        if local_app_data:
            roots.append(os.path.join(local_app_data, "Programs"))
            roots.append(local_app_data)
        if user_profile:
            roots.append(os.path.join(user_profile, "AppData", "Local", "Programs"))
            
        for root in roots:
            if not root or not os.path.exists(root):
                continue
            try:
                for folder in os.listdir(root):
                    folder_path = os.path.join(root, folder)
                    if not os.path.isdir(folder_path):
                        continue
                    for key_id, info in self.whitelisted_ides.items():
                        exec_path = os.path.join(folder_path, info["exec"])
                        if os.path.exists(exec_path):
                            detected[key_id] = exec_path
                            continue
                        cli_path = os.path.join(folder_path, "bin", info["cli"])
                        if os.path.exists(cli_path):
                            detected[key_id] = cli_path
                            continue
            except Exception:
                continue
        return detected

    def _scan_path_and_common_directories(self) -> Dict[str, str]:
        detected = {}
        user_profile = os.environ.get("USERPROFILE", "")
        program_files = os.environ.get("ProgramFiles", "C:\\Program Files")
        program_files_x86 = os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)")
        
        common_roots = [
            os.path.join(user_profile, "AppData", "Local", "Programs"),
            os.path.join(user_profile, "AppData", "Local"),
            program_files,
            program_files_x86
        ]
        
        for key_id, info in self.whitelisted_ides.items():
            cli_name = info["cli"]
            for path_dir in os.environ.get("PATH", "").split(os.pathsep):
                possible_path = os.path.join(path_dir, cli_name)
                if os.path.exists(possible_path):
                    detected[key_id] = possible_path
                    break
                    
            if key_id not in detected:
                for root in common_roots:
                    if not root:
                        continue
                    possible_folders = [
                        info["name"],
                        info["name"].replace(" ", ""),
                        info["name"].lower(),
                        info["name"].lower().replace(" ", "")
                    ]
                    for folder in possible_folders:
                        target_dir = os.path.join(root, folder)
                        if os.path.exists(target_dir):
                            exec_path = os.path.join(target_dir, info["exec"])
                            if os.path.exists(exec_path):
                                detected[key_id] = exec_path
                                break
                            cli_path = os.path.join(target_dir, "bin", info["cli"])
                            if os.path.exists(cli_path):
                                detected[key_id] = cli_path
                                break
                    if key_id in detected:
                        break
                        
        return detected

    def open_ide(self, project_id: str, ide_command: str) -> bool:
        if ide_command not in self.whitelisted_ides:
            raise ValueError(f"IDE '{ide_command}' is not whitelisted")
            
        discovered = self.scan_installed_ides()
        ide_info = next((d for d in discovered if d["id"] == ide_command), None)
        
        project_path = os.path.realpath(os.getcwd())
        
        executable = ide_info["path"] if ide_info else None
        if not executable:
            executable = self.whitelisted_ides[ide_command]["cli"].replace(".cmd", "").replace(".exe", "")
            
        try:
            subprocess.Popen(
                [executable, project_path],
                shell=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            return True
        except Exception as e:
            print(f"[IDEDiscovery] Failed to launch {ide_command}: {e}")
            try:
                cli_fallback = self.whitelisted_ides[ide_command]["cli"].replace(".cmd", "").replace(".exe", "")
                subprocess.Popen(
                    [cli_fallback, project_path],
                    shell=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                return True
            except Exception as e2:
                print(f"[IDEDiscovery] Fallback launch also failed: {e2}")
                return False

studio_ide_discovery_service = StudioIDEDiscoveryService()
