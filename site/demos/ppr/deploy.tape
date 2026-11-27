# bun scripts/record-ppr.ts が .decopin-demo/ に site/demos/ppr/app を build してから実行する
Output site/assets/ppr/deploy.gif
Set Shell "bash"
Set FontSize 18
Set Width 960
Set Height 260
Set Padding 24
Set TypingSpeed 45ms
Set Theme "Catppuccin Mocha"

Hide
Type `cd .decopin-demo && export PS1='$ ' && mycli() { bun dist/index.js "$@"; } && clear`
Enter
Sleep 300ms
Show

Type "mycli deploy"
Sleep 400ms
Enter
Sleep 5.5s
