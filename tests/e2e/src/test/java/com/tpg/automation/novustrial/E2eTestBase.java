package com.tpg.automation.novustrial;

import com.tpg.NovusGuiTestBase;
import com.tpg.actions.Take;
import com.tpg.automation.novustrial.services.UrlService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.testng.ITestResult;
import org.testng.annotations.AfterMethod;

import java.nio.file.Paths;

@ActiveProfiles({"web", "test"})
public abstract class E2eTestBase extends NovusGuiTestBase {

    @Autowired
    protected UrlService urlService;

    // Replaces Novus's version, which screenshots through new Actor() (no page) and fails.
    @Override
    @AfterMethod(alwaysRun = true)
    public void afterMethodSetup(ITestResult result) {
        if (result.getStatus() == ITestResult.FAILURE) {
            if (actor != null && actor.usesBrowser() != null) {
                var ssPath = Paths.get("src/test/resources", "screenshots",
                        result.getMethod().getConstructorOrMethod().getDeclaringClass().getSimpleName()
                                + "_" + result.getMethod().getMethodName() + System.currentTimeMillis() + ".jpg");
                actor.attemptsTo(Take.screenshot(ssPath));
                reportingService.attachResult(result, ssPath.toAbsolutePath().toString());
            } else {
                Throwable t = result.getThrowable();
                reportingService.fail("Test failed (no browser for a screenshot): " + (t == null ? "no message" : t.getMessage()));
            }
        } else if (result.getStatus() == ITestResult.SUCCESS) {
            reportingService.attachResult(result, null);
        }
    }
}
