package com.tpg.automation.novustrial;

import com.tpg.NovusApiTestBase;
import com.tpg.automation.novustrial.services.UrlService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.testng.ITestResult;
import org.testng.annotations.AfterMethod;

@ActiveProfiles({"web", "test"})
public abstract class ApiTestBase extends NovusApiTestBase {

    @Autowired
    protected UrlService urlService;

    // Replaces Novus's version, which passes a null screenshot path on failure and throws.
    @Override
    @AfterMethod(alwaysRun = true)
    public void afterMethodSetup(ITestResult result) {
        if (result.getStatus() == ITestResult.FAILURE) {
            Throwable t = result.getThrowable();
            reportingService.fail("Test failed: " + (t == null ? "no message" : t.getMessage()));
        } else {
            reportingService.attachResult(result, null);
        }
    }
}
