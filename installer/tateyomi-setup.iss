; ============================================================
; tateyomi — Inno Setup インストーラースクリプト
; 事前準備:
;   1. build-exe.bat を実行して dist/tateyomi.exe と dist/tateyomi-gui.exe を生成
;   2. Inno Setup 6 (https://jrsoftware.org/isinfo.php) をインストール
;   3. ISCC.exe installer\tateyomi-setup.iss を実行
; 出力: installer\Output\tateyomi-X.Y.Z-setup.exe
; ============================================================

#define AppName      "tateyomi"
#define AppVersion   "0.1.0"
#define AppPublisher "tateyomi contributors"
#define AppURL       "https://github.com/yourname/tateyomi"
#define AppExeName   "tateyomi.exe"
#define AppGuiExe    "tateyomi-gui.exe"
#define DistDir      "..\dist"

[Setup]
AppId={{A3F8C2D1-4E7B-4F9A-8B3C-2D5E6F7A8B9C}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}/issues
AppUpdatesURL={#AppURL}/releases
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=yes
LicenseFile=..\LICENSE
OutputDir=Output
OutputBaseFilename=tateyomi-{#AppVersion}-setup
SetupIconFile=..\tateyomi\assets\tateyomi.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
ChangesEnvironment=yes
UninstallDisplayIcon={app}\{#AppGuiExe}

[Languages]
Name: "japanese"; MessagesFile: "compiler:Languages\Japanese.isl"
Name: "english";  MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon";      Description: "デスクトップにショートカットを作成"; GroupDescription: "追加アイコン:"
Name: "addtopath";        Description: "コマンドプロンプトから tateyomi を使えるよう PATH に追加"; GroupDescription: "環境変数:"

[Files]
; CLI 実行ファイル
Source: "{#DistDir}\{#AppExeName}";  DestDir: "{app}"; Flags: ignoreversion
; GUI 実行ファイル
Source: "{#DistDir}\{#AppGuiExe}";  DestDir: "{app}"; Flags: ignoreversion
; Windows バッチランチャー（CLI wrapper）
Source: "..\tateyomi.bat";           DestDir: "{app}"; Flags: ignoreversion
Source: "..\tateyomi-gui.bat";       DestDir: "{app}"; Flags: ignoreversion
; ライセンス
Source: "..\LICENSE";                DestDir: "{app}"; Flags: ignoreversion

[Icons]
; スタートメニュー
Name: "{group}\tateyomi GUI";             Filename: "{app}\{#AppGuiExe}"
Name: "{group}\tateyomi コマンドライン";  Filename: "{sys}\cmd.exe"; Parameters: "/k tateyomi --help"; WorkingDir: "{userdocs}"
Name: "{group}\tateyomi をアンインストール"; Filename: "{uninstallexe}"
; デスクトップ
Name: "{autodesktop}\tateyomi GUI";  Filename: "{app}\{#AppGuiExe}"; Tasks: desktopicon

[Registry]
; PATH への追加 (ユーザースコープ)
Root: HKCU; Subkey: "Environment"; ValueType: expandsz; ValueName: "Path"; \
  ValueData: "{olddata};{app}"; \
  Check: NeedsAddPath('{app}'); \
  Tasks: addtopath

[Run]
; インストール完了後に GUI を起動するオプション
Filename: "{app}\{#AppGuiExe}"; \
  Description: "tateyomi GUI を今すぐ起動"; \
  Flags: nowait postinstall skipifsilent

[Code]
// PATH に既に追加されているか確認する関数
function NeedsAddPath(Param: string): boolean;
var
  OrigPath: string;
begin
  if not RegQueryStringValue(HKCU, 'Environment', 'Path', OrigPath) then
  begin
    Result := True;
    exit;
  end;
  Result := Pos(';' + Param + ';', ';' + OrigPath + ';') = 0;
end;
