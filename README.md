# Better Mode Select

**A cleaner, customizable game mode selector for League of Legends.**

Standalone Pengu Loader plugin · Version 1.0.0 · By DeliriumOverdose

## Features

* Uses the full width below the game modes for the selected mode's queues.
* Drag the top game mode cards to rearrange them.
* Hold and drag a queue in the lower section, then release it over another queue to reorder it.
* Remembers the order of modes and each mode's queues across client restarts.
* Adapts to the available client width and height, including the social panel: three, two or one queue column.
* Keeps native queue selection, eligibility warnings and the Confirm button.
* Press Escape to cancel a queue drag.

## Installation

1. Install and enable Pengu Loader for your League client.
2. Copy **Better-Mode-Select.js** into your Pengu Loader **plugins** folder.
3. Reload the League client.
4. Open **Play**, select a game mode, and drag its queues into your preferred order.

Only the JavaScript file is required. There is no build step, configuration file, external service or WHITE-GOD dependency.

**Already using WHITE-GOD?** Disable its **Better Mode Select** feature before enabling this standalone plugin. Running both versions together creates conflicting drag handlers. Their saved preferences are separate.

## Using it

Click a queue normally to select it. To move it, hold the mouse button and move a short distance: a label follows the pointer and the destination is highlighted. Release to apply the new order. The top mode cards use standard drag and drop.

## Demo

https://github.com/user-attachments/assets/b9fbb6d2-b43b-4fa6-b304-973b4aa62f9a

[Download the demonstration video](docs/demo.mp4)
