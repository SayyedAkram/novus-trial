package com.tpg.automation.novustrial.t4821;

import com.tpg.annotations.Description;
import com.tpg.annotations.MetaData;
import com.tpg.annotations.Outcome;
import com.tpg.automation.novustrial.ApiTestBase;
import com.tpg.automation.novustrial.support.Credentials;
import com.tpg.methods.Get;
import com.tpg.methods.Post;
import org.testng.annotations.Test;

public class T4821ApiTests extends ApiTestBase {

    // aire:novus TC-API-01 case=264efe643d5b73361fb7518148d9291f9c8bc66c3435c04290372448a6072b50 body=05199e52771e21076ca7e66b40a9bb67c6f785bc217af982cf9c7fbd9c88c7ed
    @MetaData(author = "AIRE novus-automate", testCaseId = "TC-API-01", stories = {"4821"}, category = "4821-API")
    @Description("List items")
    @Outcome("Status 200; the body contains items")
    @Test
    public void tcApi01ListItems() {
        step("Send GET /api/items with the admin user's bearer token");
        Get.atUrl(urlService.apiBaseUrl() + "/api/items")
                .withHeader("Authorization", "Bearer " + Credentials.token("ADMIN"))
                .execute()
                .statusCodeMatches(200)
                .bodyContains("items");
    }

    // aire:novus TC-API-02 case=5efb7cfad322715e8b5d5b4e3452419e5c37d1e157b2148ef2ab52b8ccf4e12f body=7376cf1a026c60ddaaa6c4fbb530908a5d36007748fe74af51801c75be92628f
    @MetaData(author = "AIRE novus-automate", testCaseId = "TC-API-02", stories = {"4821"}, category = "4821-API")
    @Description("Create an item")
    @Outcome("Status 201; the body contains the item name")
    @Test
    public void tcApi02CreateAnItem() {
        step("Send POST /api/items with the admin user's bearer token and the body");
        String name = "Gadget " + System.currentTimeMillis();
        Post.atUrl(urlService.apiBaseUrl() + "/api/items")
                .withHeader("Authorization", "Bearer " + Credentials.token("ADMIN"))
                .withHeader("Content-Type", "application/json")
                .withBody("{\"name\": \"" + name + "\"}")
                .execute()
                .statusCodeMatches(201)
                .bodyContains(name);
    }
}
