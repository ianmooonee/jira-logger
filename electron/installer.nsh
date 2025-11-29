!macro customInstall
  ; Copy .env.example to installation directory if .env doesn't exist
  ${IfNot} ${FileExists} "$INSTDIR\.env"
    ${If} ${FileExists} "$INSTDIR\resources\.env.example"
      CopyFiles "$INSTDIR\resources\.env.example" "$INSTDIR\.env.example"
    ${EndIf}
  ${EndIf}
!macroend
