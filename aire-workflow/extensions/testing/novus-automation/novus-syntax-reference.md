# Novus Syntax Reference (normative)

The single source of Novus syntax for `/novus-automate`. Generated code may use a Novus class or
method only if it is in the **API catalogue** below, and a non-Novus import only if it is in the
**import allow-list** (`novus-automation.md` NA-07). Everything here was checked against the Novus
source at the pin. `framework-tests/check-novus-reference.test.js` re-checks it.

---

## 1. Pin

| Item | Value |
|---|---|
| Novus repository | `https://github.com/3pillarlabs/Novus.git` |
| Pinned commit | `dc3b31dc42943e516a5a01015d00909578bcc5da` (2024-11-01) |
| Installed version | `1.0.0-aire-dc3b31d` (groupId `com.3pillarglobal`; artifacts `novus`, `novus-core`, `novus-core-ui`, `novus-core-api`) |
| Verified | 2026-11-24 |
| Java | 17–21 (Spring Boot 3.2.2 manages Lombok 1.18.30, which does not build on JDK 22 or later) |
| Stack | Spring Boot 3.2.2 · TestNG 7.10.1 · Playwright 1.46.0 · surefire 3.0.0-M7 |
| Browser MCP | `@playwright/mcp@0.0.86` — `claude mcp add playwright -- npx @playwright/mcp@0.0.86` |

**Install procedure** (agent Step 2, when `1.0.0-aire-dc3b31d` is missing from the local Maven
repository, found with `mvn help:evaluate -Dexpression=settings.localRepository -q -DforceStdout`):

```bash
git -C "$NOVUS_HOME" fetch origin
git -C "$NOVUS_HOME" worktree add "<temp>" dc3b31dc42943e516a5a01015d00909578bcc5da
mvn -q -f "<temp>/pom.xml" versions:set -DnewVersion=1.0.0-aire-dc3b31d -DgenerateBackupPoms=false
mvn -q -f "<temp>/pom.xml" install -DskipTests -pl novus-core,novus-core-ui,novus-core-api -am
git -C "$NOVUS_HOME" worktree remove --force "<temp>"     # step 3 modified tracked poms
git -C "$NOVUS_HOME" worktree prune
```

The developer's own Novus checkout is never modified.

---

## 2. API catalogue

Packages: actions, `Verify` and `LocateBy` are in `novus-core-ui`; `Actor`, `Performable`,
`NovusHardAssert`, annotations and `BaseUrlService` in `novus-core`; `Get/Post/Put/Delete` in
`novus-core-api`. `NovusGuiTestBase` and `NovusApiTestBase` (package `com.tpg`) ship in the
`test-jar`s.

### 2.1 Actor and Performable

| Signature | Use |
|---|---|
| `com.tpg.actor.Actor` — `void attemptsTo(Performable... tasks)` | Run actions in order |
| `void wantsTo(Verifiable verify)` | Run one verification |
| `boolean is(Waiter waiter)` | Evaluate a `Waiting` condition |
| `Page usesBrowser()` | The Playwright page (only for `title()` checks, section 6) |
| `com.tpg.actions.Performable` — `void performAs(Actor actor)`, `Performable byWaitingFor(double seconds)` | Return type of every impl method |

### 2.2 Browser and navigation

| Signature | Use |
|---|---|
| `com.tpg.actions.Open` — `static Performable browser()` | Launch Chromium; call once per class, after `actor` is assigned |
| `com.tpg.actions.Launch` — `static Launch website(String url)`, `Performable withConfigs(Page.NavigateOptions configs)` | `Launch.website(urlService.baseUrl() + "/path").withConfigs(pageOptions.getDefaultSetupOptions())` |
| `com.tpg.actions.Close` — `static Performable browser()` | Called by Novus `tearDown`; never generated |
| `com.tpg.actions.BrowserRefresh` — `static BrowserRefresh refreshBrowser()`, `BrowserRefresh times(int)` | Reload |
| `com.tpg.actions.Take` — `static Performable screenshot(Path path)` | Used only in the `E2eTestBase` template |

### 2.3 Element actions

| Signature | Use |
|---|---|
| `com.tpg.actions.Click` — `static Click on(String locator)`; `Click nth(int)`, `Click last()` | Click |
| `com.tpg.actions.DoubleClick` — `static DoubleClick on(String locator)` | Double-click |
| `com.tpg.actions.Enter` — `static Enter text(String)` / `text(int)` / `text(double)`; `Enter on(String by)`, `Enter nth(int)` | Fill a field |
| `com.tpg.actions.Type` — `static Type text(String)`; `Type on(String by)`, `Type withDelay()` | Type key by key (no `ifDisplayed`) |
| `com.tpg.actions.Clear` — `static Clear locator(String locator)` | Clear a field |
| `com.tpg.actions.Select` — `static Select option(String label)`, `static Select options(String... options)`; `Select on(String selectLocator)` | Choose from a `<select>` |
| `com.tpg.actions.CheckBox` — `static CheckBox check(String)`, `static CheckBox uncheck(String)` | Tick / untick |
| `com.tpg.actions.Keyboard` — `static Keyboard press(String key)`; `Keyboard on(String locator)`, `Performable times(int)` | Key press |
| `com.tpg.actions.Alert` — `static Alert accept()`, `static Alert dismiss()` | Register a dialog handler before the action that opens it |
| `com.tpg.actions.Perform` — `static Perform actions(Performable... tasks)`, `Performable log(String callingMethod, String log)` | Wrap every impl method; `.log(...)` is mandatory |

### 2.4 Waits, reads and checks

| Signature | Use |
|---|---|
| `com.tpg.actions.Waiting` — `static Waiting on(String locator)`, `Waiting seconds(double)`, `Waiting within(double)`, `Waiting toBe(WaitForSelectorState)` | **`on(x).seconds(n)` waits for VISIBLE for `n` seconds.** With `toBe(...)`, `seconds()` is ignored — use `within(n)` |
| `com.tpg.actions.Retrieve` — `static Retrieve text()`, `currentUrl()`, `attribute(String)`, `value()`, `inputValue()`, `count()`; `Retrieve ofLocator(String)`, `Retrieve atIndex(int)`, `String getAs(Actor actor)` | Read a value for a check |
| `com.tpg.verification.Verify` — `static Verify<Object> uiElement(String locator)`, `static Verify<Object> page()`; `Verifiable containsText(String)`, `hasText(String)`, `doesNotContainText(String)`, `isNotVisible()`, `isDisabled()`; `Verify<T> url()` then `Verifiable contains(String regex)`; `Verify<T> describedAs(String)` | UI checks (see section 6 for the ones never used) |
| `com.tpg.verification.NovusHardAssert` — `static <T> NovusHardAssert<T> verify(T actual, Matcher<? super T> matcher)`, `NovusHardAssert<T> describedAs(String)` | Every other check, through `actor.wantsTo(...)` |

### 2.5 Locators

| Signature | Produces |
|---|---|
| `com.tpg.locatorstrategy.LocateBy.css(String css)` | `css=<css>` |
| `LocateBy.id(String id)` | `id=<id>` |
| `LocateBy.name(String name)` | `css=[name='<name>']` |
| `LocateBy.withExactCssText(String css, String text)` | `<css>:text-is("<text>")` |

### 2.6 API

| Signature | Use |
|---|---|
| `com.tpg.methods.Get` / `Post` / `Put` / `Delete` — `static X atUrl(String url)` | Start a request |
| `ApiCore<T>` builders — `withHeader(String, String)`, `withParam(String, String)`, `withParam(String, int)`, `withBasicAuth(String, String)`, `withBody(String)`, `jsonBody(Object)`, `withFormData(Map<String,String>)` | Build it |
| `T execute()` | Send it |
| Checks — `statusCodeMatches(int)`, `bodyContains(String)`, `isOk()`, `isNotOk()` | Assert on the response |
| Reads — `boolean statusOk()`, `String getContent()`, `APIResponse getResponse()` (`.status()` for the code), `<B> B mapToObject(Class<B>)`, `<B> List<B> mapToList(Class<B>)` | Read the response. There is no public `code()`: it belongs to a private enum inside `ApiCore` |

### 2.7 Test bases, annotations, services

| Signature | Use |
|---|---|
| `com.tpg.NovusGuiTestBase` — fields `protected Actor actor`, `protected PageOptions pageOptions`, `protected NovusReportingService reportingService`; `protected void step(String step, Object... obj)`; `public void afterMethodSetup(ITestResult result)` | Extended only by the `E2eTestBase` template |
| `com.tpg.NovusApiTestBase` — `protected void step(String step, Object... obj)` | Extended only by the `ApiTestBase` template |
| `com.tpg.browser.PageOptions` — `Page.NavigateOptions getDefaultSetupOptions()` | Argument to `Launch…withConfigs` |
| `com.tpg.services.BaseUrlService` — `protected String protocol, domain`; `abstract String baseUrl()` | Extended only by the `UrlService` template |
| `com.tpg.annotations.MetaData` — `String[] stories()`, `String[] bugs()`, `String author()`, `String testCaseId()`, `String category()` | On every `@Test` |
| `com.tpg.annotations.Description` — `String value()`; `com.tpg.annotations.Outcome` — `String value()` | On every `@Test` |

---

## 3. Import allow-list (non-Novus)

| Import | Why |
|---|---|
| `org.testng.annotations.Test`, `BeforeClass`, `AfterMethod`; `org.testng.ITestResult` | Test structure |
| `org.springframework.beans.factory.annotation.Autowired`, `Value` | Injection |
| `org.springframework.test.context.ActiveProfiles` | Templates only |
| `org.springframework.stereotype.Service`; `org.springframework.context.annotation.Scope`, `ScopedProxyMode` | `UrlService` template only |
| `com.microsoft.playwright.options.WaitForSelectorState` | `toBe(...)` |
| `java.nio.file.Paths`, `java.util.Map` | Templates, form data |
| `static org.hamcrest.Matchers.is`, `containsString`, `equalTo` | `NovusHardAssert` matchers — single static imports only |

Never import `com.tpg.utils.CodeFillers` (its `is` clashes with Hamcrest `is`), and never use
wildcard imports.

---

## 4. Mandatory rules

1. Every impl method returns `Perform.actions(...).log("<methodName>", "<step text>")` — without `.log`
   Novus throws `NovusConfigException`.
2. Every `@Test` carries `@MetaData`, `@Description` and `@Outcome` — a missing one makes Novus
   reporting throw a NullPointerException. `novus-tools.cjs scan` checks this.
3. In a UI test class, `@BeforeClass` assigns `actor = new AppUser();` before
   `actor.attemptsTo(Open.browser());` — Novus `tearDown` calls `actor` unconditionally.
4. Each case starts with `Launch.website(...)` and signs in itself when it needs to; no case depends on
   another case's state.
5. Step text is passed to `step(...)` unchanged: Novus passes it as a value, not as a format pattern.
6. Credentials only through the `Credentials` template (`Credentials.username("ADMIN")` …), never a
   literal. URLs only through `urlService.baseUrl()` / `urlService.apiBaseUrl()`.

---

## 5. Selector forms (NA-05)

| Form | Uniqueness check (MCP evaluate) | Generated locator |
|---|---|---|
| `data-testid` | `document.querySelectorAll('[data-testid="' + CSS.escape(v) + '"]').length === 1` | `LocateBy.css("[data-testid='v']")` |
| `id` | `document.querySelectorAll('#' + CSS.escape(v)).length === 1` | `LocateBy.id("v")` |
| `name` | `document.querySelectorAll('[name="' + CSS.escape(v) + '"]').length === 1` | `LocateBy.name("v")` |
| text | `[...document.querySelectorAll(tag)].filter(e => e.textContent.trim().replace(/\s+/g, ' ') === t).length === 1` | `LocateBy.withExactCssText("<tag>", "t")` |

Skip a form whose value or text contains `"` or `'`. In Java literals escape `\` and `"`.

---

## 6. Do-not-use list

This is the complete set. `novus-tools.cjs scan` parses the `Pattern` column of this table.

| Pattern | Why | Use instead |
|---|---|---|
| `Verify\.uiElement\([^;]*\)\.isVisible\(\)` | Checks *enabled*, not visible | `actor.wantsTo(NovusHardAssert.verify(actor.is(Waiting.on(X).seconds(10)), is(true)).describedAs("X is visible"));` |
| `\bsoftly\b` | `NovusSoftAssert` is never asserted automatically | `NovusHardAssert` |
| `Verify\.page\(\)\.title\(\)` | A failed title check only logs | `actor.wantsTo(NovusHardAssert.verify(actor.usesBrowser().title(), containsString("…")).describedAs("page title"));` |
| `Launch\.app\(` | Does not exist (README only) | `Launch.website(...)` |
| `getAppUrl\(` | Does not exist (README only) | `urlService.baseUrl()` |
| `Type\.text\([^;]*\)\.ifDisplayed` | Does not exist | `Enter.text(...).on(X).ifDisplayed(X)` or a plain `Type` |

Fixed in the templates, not on this list (they are base-class overrides, not calls to avoid):
`NovusGuiTestBase.afterMethodSetup` screenshots through `new Actor()` (no page) and
`NovusApiTestBase.afterMethodSetup` passes a `null` screenshot path to `attachResult`; both throw a
NullPointerException on a failing test. `E2eTestBase` and `ApiTestBase` (R§9.6, R§9.7) override
`afterMethodSetup` and report failures with `reportingService.fail(...)`.

Known and accepted: `Verify`'s failure branches call `getMessage().substring(1, 150)`, so a short
assertion message throws `StringIndexOutOfBoundsException` — the test still fails; the summary takes
its failure text from `testng-results.xml`.

---

## 7. Layout and naming (NA-06)

```text
tests/e2e/
├── pom.xml  .gitignore
├── suites/<TICKET-ID>.xml
├── automation/<TICKET-ID>.md  automation/<TICKET-ID>.runs.md
└── src/
    ├── main/java/<basePackage>/services/UrlService.java
    ├── main/java/<basePackage>/support/Credentials.java
    ├── main/java/<basePackage>/actors/AppUser.java
    ├── main/java/<basePackage>/t<TICKET-ID>/{pages,impls,macros}/…
    ├── test/java/<basePackage>/E2eTestBase.java  ApiTestBase.java
    ├── test/java/<basePackage>/t<TICKET-ID>/T<TICKET-ID><Plan>Tests.java
    └── test/resources/application-test.properties  application-local.properties
```

| Manual plan element | Generated element |
|---|---|
| `### TC-E2E-01 — Short title` | `@Test public void tcE2e01ShortTitle()` in `T<ID>E2eTests`, preceded by its marker |
| Traces to, Tracker ID | `@MetaData(author = "AIRE novus-automate", testCaseId = "TC-E2E-01", stories = {"<ID>"}, category = "<ID>-E2E")` |
| Short title / first Expected result | `@Description("…")` / `@Outcome("…")` |
| Each numbered step | `step("<text>");` then `actor.attemptsTo(<Impl>.<method>(…));` |
| Element | `public static final String <NAME> = LocateBy.…;` in `t<ID>/pages/<Screen>Page.java` |
| UI action | `public static Performable <method>(…)` in `t<ID>/impls/<Screen>PageImpl.java` |
| Sequence used by 2+ cases | `public static Performable <name>(…)` in `t<ID>/macros/<Name>.java` |
| API case | `T<ID>ApiTests extends ApiTestBase`; `Get.atUrl(urlService.apiBaseUrl() + "/path")…` |
| Mixed browser + HTTP case | In the UI test class (`E2eTestBase`) |
| Created unique value | Suffix `System.currentTimeMillis()` |

---

## 8. Regeneration (NA-09)

- **Marker**: `// aire:novus <TC-ID> case=<sha256> body=<sha256>` on the line before the method's first
  annotation.
- **Case text**: from the line `### <TC-ID>` up to, not including, the next line starting with `### `
  or `## `.
- **Body text**: between the method's `{` and its matching `}`, found by a Java-aware scan that skips
  string literals, text blocks, character literals, line comments and block comments.
- **Normalisation** (both): CRLF and CR → LF; trailing whitespace removed per line; runs of blank lines
  → one; leading and trailing blank lines removed. Then SHA-256, lower-case hex.
- **Tools**: `node <tools> hash-case <plan-file> <TC-ID>`, `node <tools> hash-body <java-file> <method>`.

---

## 9. Templates

Placeholders: `{{basePackage}}`, `{{repo}}`, `{{TICKET_ID}}`, `{{title}}`, `{{novusVersion}}`
(`1.0.0-aire-dc3b31d`). Once-per-repo templates contain no timestamps or per-run values, so two
first-time scaffolds on the same AIRE version are byte-identical.

### 9.1 `tests/e2e/pom.xml` (once per repo)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <!-- Generated by AIRE /novus-automate. Standalone module: never add it to a root build. -->
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.2</version>
        <relativePath/>
    </parent>
    <groupId>{{basePackage}}</groupId>
    <artifactId>e2e-tests</artifactId>
    <version>1.0.0</version>
    <properties>
        <java.version>17</java.version>
        <aire.novusPin>{{novusVersion}}</aire.novusPin>
        <aire.basePackage>{{basePackage}}</aire.basePackage>
    </properties>
    <dependencies>
        <dependency>
            <groupId>com.3pillarglobal</groupId>
            <artifactId>novus-core</artifactId>
            <version>${aire.novusPin}</version>
        </dependency>
        <dependency>
            <groupId>com.3pillarglobal</groupId>
            <artifactId>novus-core-ui</artifactId>
            <version>${aire.novusPin}</version>
        </dependency>
        <dependency>
            <groupId>com.3pillarglobal</groupId>
            <artifactId>novus-core-api</artifactId>
            <version>${aire.novusPin}</version>
        </dependency>
        <dependency>
            <groupId>com.3pillarglobal</groupId>
            <artifactId>novus-core-ui</artifactId>
            <version>${aire.novusPin}</version>
            <type>test-jar</type>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>com.3pillarglobal</groupId>
            <artifactId>novus-core-api</artifactId>
            <version>${aire.novusPin}</version>
            <type>test-jar</type>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.0.0-M7</version>
                <dependencies>
                    <dependency>
                        <groupId>org.apache.maven.surefire</groupId>
                        <artifactId>surefire-testng</artifactId>
                        <version>3.0.0-M7</version>
                    </dependency>
                </dependencies>
            </plugin>
        </plugins>
    </build>
</project>
```

Pin reconcile (agent Step 6): when `<aire.novusPin>` differs from section 1, set it to the section 1
version. The three Novus dependencies follow it through `${aire.novusPin}`.

### 9.2 `tests/e2e/.gitignore` (once per repo)

```text
target/
src/test/resources/reports/
src/test/resources/screenshots/
```

### 9.3 `UrlService.java` (once per repo)

```java
package {{basePackage}}.services;

import com.tpg.services.BaseUrlService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.stereotype.Service;

@Service
@Scope(value = "thread-scope", proxyMode = ScopedProxyMode.TARGET_CLASS)
public class UrlService extends BaseUrlService {

    @Value("${aut.baseUrl:}")
    private String baseUrl;

    @Value("${aut.apiBaseUrl:}")
    private String apiBaseUrl;

    @Override
    public String baseUrl() {
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new IllegalStateException("aut.baseUrl is not set");
        }
        return baseUrl;
    }

    public String apiBaseUrl() {
        return apiBaseUrl == null || apiBaseUrl.isBlank() ? baseUrl() : apiBaseUrl;
    }
}
```

### 9.4 `Credentials.java` (once per repo)

```java
package {{basePackage}}.support;

public final class Credentials {

    private Credentials() {
    }

    public static String username(String role) {
        return read(role, "USERNAME");
    }

    public static String password(String role) {
        return read(role, "PASSWORD");
    }

    public static String token(String role) {
        return read(role, "TOKEN");
    }

    private static String read(String role, String part) {
        String key = "AUT_" + role + "_" + part;
        String value = System.getProperty(key, System.getenv(key));
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(key + " is not set");
        }
        return value;
    }
}
```

Credentials are read from environment variables (or `-D` system properties of the same name) by this
helper rather than per-role property lines, so no story ever edits a shared file to add a role.

### 9.5 `AppUser.java` (once per repo)

```java
package {{basePackage}}.actors;

import com.tpg.actor.Actor;

public class AppUser extends Actor {
}
```

### 9.6 `E2eTestBase.java` (once per repo)

```java
package {{basePackage}};

import com.tpg.NovusGuiTestBase;
import com.tpg.actions.Take;
import {{basePackage}}.services.UrlService;
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
```

### 9.7 `ApiTestBase.java` (once per repo)

```java
package {{basePackage}};

import com.tpg.NovusApiTestBase;
import {{basePackage}}.services.UrlService;
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
```

### 9.8 `application-test.properties` (once per repo)

```properties
########### application under test ###########
# URLs come only at run time: -Daut.baseUrl=... / AUT_BASE_URL and -Daut.apiBaseUrl=... / AUT_API_BASE_URL
aut.protocol=
aut.domain=
aut.baseUrl=${AUT_BASE_URL:}
aut.apiBaseUrl=${AUT_API_BASE_URL:}
# Hosts /novus-automate may drive besides loopback, comma-separated. Read from the Base Branch only.
# Listing a host accepts automated writes there. Never list a production host.
aut.allowedHosts=
########### reporting ###########
emailable.report.enabled=true
emailable.report.name={{repo}} E2E
```

### 9.9 `application-local.properties` (once per repo)

```properties
########### headed browser for debugging by hand (add the "local" profile); never used by the skill ###########
browser.headless=false
browser.headlessArgs=
browser.ignoreArgs=
```

### 9.10 `suites/<TICKET-ID>.xml` (per story)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE suite SYSTEM "https://testng.org/testng-1.0.dtd">
<suite name="{{TICKET_ID}} Novus automation" configfailurepolicy="continue">
    <parameter name="report-name" value="{{TICKET_ID}}"/>
    <test name="{{TICKET_ID}}">
        <classes>
            <class name="{{basePackage}}.t{{TICKET_ID}}.T{{TICKET_ID}}E2eTests"/>
            <class name="{{basePackage}}.t{{TICKET_ID}}.T{{TICKET_ID}}ApiTests"/>
        </classes>
    </test>
</suite>
```

List only the test classes the story has, minus cases removed for missing credentials (agent Step 10
rewrites the `<classes>` or adds `<methods><exclude …/></methods>`).

### 9.11 Summary skeleton — `automation/<TICKET-ID>.md` (per story)

```markdown
# Novus Automation — {{TICKET_ID}} {{title}}

## Source

| Item | Value |
|---|---|
| Story | … |
| Plan ref | `<ref>` @ `<sha>` |
| Novus pin | {{novusVersion}} |
| AIRE version | v[N] |
| Mode | local — not Verification Engineer sign-off / env |
| Run time | <ISO 8601> |
| Not in scope | … |

## Cases

| TC | Plan file | Selected | State | Reason | Test method | Locator sources | Case hash |
|---|---|---|---|---|---|---|---|

## Novus Gaps

none

## Changes This Run

none
```

### 9.12 Run log skeleton — `automation/<TICKET-ID>.runs.md` (per story)

```markdown
# Novus Automation Runs — {{TICKET_ID}}

| Timestamp | Mode | Hosts | Plan SHA | pass | fail | skip | not-automated | PR | Audit |
|---|---|---|---|---|---|---|---|---|---|
```

---

## 10. Worked examples

The Java blocks below are compiled by `framework-tests/check-novus-reference.test.js` with
`{{basePackage}}` = `com.tpg.automation.sample` and `{{TICKET_ID}}` = `4821`.

### 10.1 E2E case

Manual case (from `e2e-test-steps.md`):

```markdown
### TC-E2E-01 — Submit the item form

| Field | Value |
|-------|-------|
| **Traces to** | AC-1 |
| **Test data** | admin user; item name "Widget" |

**Steps**
1. Open the items page
2. Enter the item name
3. Press Save

**Expected result**
- The confirmation "Item saved" is shown
```

Generated page, impl and test:

```java novus-example
package com.tpg.automation.sample.t4821.pages;

import com.tpg.locatorstrategy.LocateBy;

public final class ItemsPage {

    private ItemsPage() {
    }

    public static final String ITEM_NAME = LocateBy.css("[data-testid='item-name']");
    public static final String SAVE = LocateBy.id("save");
    public static final String CONFIRMATION = LocateBy.css("[data-testid='confirmation']");
}
```

```java novus-example
package com.tpg.automation.sample.t4821.impls;

import com.tpg.actions.Click;
import com.tpg.actions.Enter;
import com.tpg.actions.Perform;
import com.tpg.actions.Performable;
import com.tpg.automation.sample.t4821.pages.ItemsPage;

public final class ItemsPageImpl {

    private ItemsPageImpl() {
    }

    public static Performable enterItemName(String name) {
        return Perform.actions(Enter.text(name).on(ItemsPage.ITEM_NAME)).log("enterItemName", "Enter the item name");
    }

    public static Performable pressSave() {
        return Perform.actions(Click.on(ItemsPage.SAVE)).log("pressSave", "Press Save");
    }
}
```

```java novus-example
package com.tpg.automation.sample.t4821;

import com.tpg.actions.Launch;
import com.tpg.actions.Open;
import com.tpg.annotations.Description;
import com.tpg.annotations.MetaData;
import com.tpg.annotations.Outcome;
import com.tpg.automation.sample.E2eTestBase;
import com.tpg.automation.sample.actors.AppUser;
import com.tpg.automation.sample.t4821.impls.ItemsPageImpl;
import com.tpg.automation.sample.t4821.pages.ItemsPage;
import com.tpg.verification.Verify;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

public class T4821E2eTests extends E2eTestBase {

    @BeforeClass
    public void openBrowser() {
        actor = new AppUser();
        actor.attemptsTo(Open.browser());
    }

    // aire:novus TC-E2E-01 case=<sha256> body=<sha256>
    @MetaData(author = "AIRE novus-automate", testCaseId = "TC-E2E-01", stories = {"4821"}, category = "4821-E2E")
    @Description("Submit the item form")
    @Outcome("The confirmation \"Item saved\" is shown")
    @Test
    public void tcE2e01SubmitTheItemForm() {
        step("Open the items page");
        actor.attemptsTo(Launch.website(urlService.baseUrl() + "/items").withConfigs(pageOptions.getDefaultSetupOptions()));
        step("Enter the item name");
        actor.attemptsTo(ItemsPageImpl.enterItemName("Widget " + System.currentTimeMillis()));
        step("Press Save");
        actor.attemptsTo(ItemsPageImpl.pressSave());
        actor.wantsTo(Verify.uiElement(ItemsPage.CONFIRMATION).describedAs("confirmation is shown").containsText("Item saved"));
    }
}
```

### 10.2 API case

Manual case (from `api-test-steps.md`): `TC-API-01 — List items`, Test data "admin user", Steps
"GET /api/items with the admin token", Expected result "status 200; the body contains `items`".

```java novus-example
package com.tpg.automation.sample.t4821;

import com.tpg.annotations.Description;
import com.tpg.annotations.MetaData;
import com.tpg.annotations.Outcome;
import com.tpg.automation.sample.ApiTestBase;
import com.tpg.automation.sample.support.Credentials;
import com.tpg.methods.Get;
import org.testng.annotations.Test;

public class T4821ApiTests extends ApiTestBase {

    // aire:novus TC-API-01 case=<sha256> body=<sha256>
    @MetaData(author = "AIRE novus-automate", testCaseId = "TC-API-01", stories = {"4821"}, category = "4821-API")
    @Description("List items")
    @Outcome("status 200; the body contains items")
    @Test
    public void tcApi01ListItems() {
        step("GET /api/items with the admin token");
        Get.atUrl(urlService.apiBaseUrl() + "/api/items")
                .withHeader("Authorization", "Bearer " + Credentials.token("ADMIN"))
                .execute()
                .statusCodeMatches(200)
                .bodyContains("items");
    }
}
```

---

## 11. Upgrade procedure (maintainers)

1. Pick the new Novus commit; update section 1 (commit, version `1.0.0-aire-<sha7>`, date).
2. Re-check every catalogue row (section 2) and every do-not-use row (section 6) against the new
   source; adjust templates if a base class changed.
3. With `NOVUS_HOME` set, run `node --test framework-tests/check-novus-reference.test.js` until it
   passes.
4. Bump the AIRE framework version in `CLAUDE.md` and the package version, so subscribers receive the
   new pin through the normal update PR.
