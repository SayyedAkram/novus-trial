package com.tpg.automation.novustrial.t4821.pages;

import com.tpg.locatorstrategy.LocateBy;

public final class ItemsPage {

    private ItemsPage() {
    }

    public static final String ITEM_NAME = LocateBy.css("[data-testid='item-name']");
    public static final String SAVE = LocateBy.id("save");
    public static final String CONFIRMATION = LocateBy.css("[data-testid='confirmation']");
}
