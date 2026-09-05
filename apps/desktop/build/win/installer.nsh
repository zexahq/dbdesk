!macro customInstall
  ; Create the CLI wrapper batch file
  SetOutPath "$INSTDIR"
  
  FileOpen $0 "$INSTDIR\dbdesk.cmd" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'node "$INSTDIR\resources\cli\index.js" %*$\r$\n'
  FileClose $0
  
  ; Add to PATH for current user
  ; electron-builder handles this via the NSIS config, but we add the wrapper here
  EnVar::SetHKCU
  EnVar::AddValue "PATH" "$INSTDIR"
  Pop $0
  
!macroend

!macro customUninstall
  ; Remove from PATH
  EnVar::SetHKCU
  EnVar::DeleteValue "PATH" "$INSTDIR"
  Pop $0
  
  Delete "$INSTDIR\dbdesk.cmd"
!macroend
