package com.tpg.automation.novustrial.t4821;

import com.tpg.actions.Launch;
import com.tpg.actions.Open;
import com.tpg.annotations.Description;
import com.tpg.annotations.MetaData;
import com.tpg.annotations.Outcome;
import com.tpg.automation.novustrial.E2eTestBase;
import com.tpg.automation.novustrial.actors.AppUser;
import com.tpg.automation.novustrial.t4821.impls.ItemsPageImpl;
import com.tpg.automation.novustrial.t4821.pages.ItemsPage;
import com.tpg.verification.Verify;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

public class T4821E2eTests extends E2eTestBase {

    @BeforeClass
    public void openBrowser() {
        actor = new AppUser();
        actor.attemptsTo(Open.browser());
    }

    // aire:novus TC-E2E-01 case=f98497040c9533935360f31e7546c4cdf4fee9b86c6d6112f641c901a66d4b84 body=5d6accc3337c18948b64878c82374171d6e589d3d3c36719e3b8e5cb262a8bdb
    @MetaData(author = "AIRE novus-automate", testCaseId = "TC-E2E-01", stories = {"4821"}, category = "4821-E2E")
    @Description("Save an item from the items page")
    @Outcome("The confirmation \"Item stored\" is shown")
    @Test
    public void tcE2e01SaveAnItemFromTheItemsPage() {
        step("Open the items page");
        actor.attemptsTo(Launch.website(urlService.baseUrl() + "/items").withConfigs(pageOptions.getDefaultSetupOptions()));
        step("Enter the item name \"Widget\"");
        actor.attemptsTo(ItemsPageImpl.enterItemName("Widget " + System.currentTimeMillis()));
        step("Press Save");
        actor.attemptsTo(ItemsPageImpl.pressSave());
        actor.wantsTo(Verify.uiElement(ItemsPage.CONFIRMATION).describedAs("confirmation is shown").containsText("Item stored"));
    }
}
