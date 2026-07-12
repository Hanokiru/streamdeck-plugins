import streamDeck from "@elgato/streamdeck";

import { CursorUsageAction } from "./actions/cursor-usage";

streamDeck.logger.setLevel("info");
streamDeck.actions.registerAction(new CursorUsageAction());
streamDeck.connect();
