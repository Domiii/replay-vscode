# Replay in VSCode

This is a nice little prototype to demonstrate the theoretical potential of having Replay work in VScode.


## Dev Setup

* Preparations
  * Set `$REPLAY_DIR` to point to your replay root directory.
  * Clone replay devtools:
    ```sh
    cd $REPLAY_DIR && git clone https://github.com/replayio/devtools.git
    ```
* When you install the first time:
  ```sh
  cd $REPLAY_DIR
  <git clone this thing>
  cd ./replay-vscode
  yarn install
  npm i -g yalc # Install yalc globally
  yarn publish-devtools # publish some devtools packages to yalc
  yarn link-devtools # establish linkage with locally yalc'ed devtools version
  echo "Good to go!"
  ```
* Normal dev cycle:
  * Open this in VSCode.
  * Change code...
  * Press F5 to run and debug!
  * NOTE: F5 will run a background `webpack watch` task in a terminal tab (CTRL/Command + \`). Make sure to monitor it when things go awry.
