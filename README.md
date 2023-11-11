# Replay in VSCode

This is a nice little prototype to demonstrate the theoretical potential of having Replay work in VScode.


## Dev Setup

* Make sure you have:
  * `$REPLAY_DIR` set to point to your replay root directory.
  * <s>`$REPLAY_DIR/devtools` cloned</s>
* Install the first time:
  ```sh
  cd $REPLAY_DIR
  git clone this thing
  cd ./replay-vscode # (this ended up not working)
  yarn install
  # yarn publish-devtools # publish devtools to yalc
  # yarn linkit # establish linkage with locally yalc'ed devtools version
  ```
