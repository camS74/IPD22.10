Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
strScriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Kill existing Node.js processes
objShell.Run "taskkill /F /IM node.exe", 0, True

' Wait 2 seconds
WScript.Sleep 2000

' Start backend server
objShell.Run "cmd /c cd /d """ & strScriptDir & "\server"" && npm start", 1

' Wait 5 seconds for backend to initialize
WScript.Sleep 5000

' Start frontend server  
objShell.Run "cmd /c cd /d """ & strScriptDir & """ && npm start", 1

' Show completion message
MsgBox "IPDash servers are starting up!" & vbCrLf & vbCrLf & _
       "Backend: http://localhost:3001" & vbCrLf & _
       "Frontend: http://localhost:3000", _
       vbInformation, "IPDash Server Startup"






















