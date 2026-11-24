package com.tpg.automation.novustrial.t4821.impls;

import com.tpg.actions.Click;
import com.tpg.actions.Enter;
import com.tpg.actions.Perform;
import com.tpg.actions.Performable;
import com.tpg.automation.novustrial.t4821.pages.ItemsPage;

public final class ItemsPageImpl {

    private ItemsPageImpl() {
    }

    public static Performable enterItemName(String name) {
        return Perform.actions(Enter.text(name).on(ItemsPage.ITEM_NAME)).log("enterItemName", "Enter the item name \"Widget\"");
    }

    public static Performable pressSave() {
        return Perform.actions(Click.on(ItemsPage.SAVE)).log("pressSave", "Press Save");
    }
}
