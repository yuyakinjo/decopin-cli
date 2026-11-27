# bun scripts/record-ppr.ts が .decopin-demo/ に site/demos/ppr/app を build してから実行する
Output site/assets/ppr/redirect.gif
Set Shell "bash"
Set FontSize 18
Set Width 960
Set Height 340
Set Padding 24
Set TypingSpeed 45ms
Set Theme "Catppuccin Mocha"

Hide
Type `cd .decopin-demo && export PS1='$ ' && mycli() { bun dist/index.js "$@"; } && clear`
Enter
Sleep 300ms
Show

Type "mycli deploy > deploy.log"
Sleep 400ms
Enter
Sleep 5.5s
Type "cat deploy.log"
Sleep 400ms
Enter
Sleep 2.5s
