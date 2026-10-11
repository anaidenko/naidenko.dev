# Code audit: OWASP Juice Shop v20.2.0

The findings of a code audit, for an AI coding agent working on the audited code. Exported by Auditdesk on 2026-10-11 from the audit by Andrii Naidenko.

## How to work through it

- The findings run worst first, and their IDs (F-012) stay the same through re-audits: name the ID in the commit or pull request that fixes one.
- Each finding cites files and lines at the commit listed under Audited code, or at a commit in git history where it says so. Read the cited code first; if it no longer matches, say so rather than guess.
- Fix what the recommendation describes, with a test where the code has tests, and leave unrelated code as it is.
- Start with the findings to fix before sign-off.
- Open questions need an answer from the team: do not settle one by assumption.

## Audited code

This sample audited OWASP Juice Shop v20.2.0 (upstream https://github.com/juice-shop/juice-shop/tree/5658473cf8814459bf89000ce373b20ed0b4eb37) as Auditdesk's eval prepares it (`evals/prep`): the answers to its coding challenges removed and its challenges renamed, in one commit, 4b369c91932c. Line numbers refer to that prepared tree.

- juice-shop-v20.2.0-4b369c9 · branch main · commit 4b369c91932c9f15a8b0fe28fc556b5ad4e77062

Aspects examined: Security, LLM integrations.

## Summary

- Fix before sign-off: F-004, F-005, F-023, F-031, F-035, F-036, F-038, F-039, F-040, F-050, F-053, F-054, F-055, F-012, F-015, F-017, F-022, F-024, F-025, F-026, F-027, F-028, F-029, F-032, F-033, F-034, F-037, F-042, F-043, F-046, F-048, F-051, F-052, F-056
- Can wait: F-014, F-030, F-044, F-045, F-047, F-049, F-057, F-041, F-059
- Open questions: F-058

## Findings

### F-004: Secret in the code: Identified a Private Key, which may compromise cryptographic security and sensitive data encryption.

**Severity:** critical · **Checklist item:** SEC-10 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

A credential matching gitleaks rule "private-key" is committed in infrastructure/terraform/networking.tf.

#### Details

Removing a secret from the code does not remove it from git history; every clone keeps it.

**Likelihood:** Anyone with read access to the repository can use it.
**Impact:** Depends on what the credential grants; assume full access to that service.

#### Evidence

`infrastructure/terraform/networking.tf`, line 170

```
[secret masked: private-key]
```

`terraform/networking.tf`, line 170

```
[secret masked: private-key]
```

#### Recommendation

Rotate the credential first, then remove it from the code and load it from the environment or a secret store.

#### References

- [A07:2025 Authentication Failures](https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/)
- [CWE-798](https://cwe.mitre.org/data/definitions/798.html)
- [ASVS 5.0.0 V13.3 Secret Management](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x22-V13-Configuration.md#v133-secret-management)
- [Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

### F-005: Secret in the code: Identified a Private Key, which may compromise cryptographic security and sensitive data encryption.

**Severity:** critical · **Checklist item:** SEC-10 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

A credential matching gitleaks rule "private-key" is committed in lib/insecurity.ts.

#### Details

Removing a secret from the code does not remove it from git history; every clone keeps it.

**Likelihood:** Anyone with read access to the repository can use it.
**Impact:** Depends on what the credential grants; assume full access to that service.

#### Evidence

`lib/insecurity.ts`, line 21

```
[secret masked: private-key]
```

`lib/insecurity.ts`, line 54

```
export const authorize = (user = {}) => jwt.sign(user, privateKey, { expiresIn: '6h', algorithm: 'RS256' })
```

#### Recommendation

Rotate the credential first, then remove it from the code and load it from the environment or a secret store.

#### References

- [A07:2025 Authentication Failures](https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/)
- [CWE-798](https://cwe.mitre.org/data/definitions/798.html)
- [ASVS 5.0.0 V13.3 Secret Management](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x22-V13-Configuration.md#v133-secret-management)
- [Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

### F-023: Ancient JWT libraries accept forged tokens; algorithm never pinned

**Severity:** critical · **Checklist item:** SEC-02 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** M (up to 2 days) · **Fix before sign-off:** yes

The login tokens can be forged. Anyone can make a token that says "I am the administrator" and the server will believe it.

#### Details

package.json pins `jsonwebtoken` 0.4.0 and `express-jwt` 0.1.3. Both predate the algorithm-confusion fixes. `isAuthorized()` passes only `secret: publicKey` and no `algorithms`. `verify()` calls `jws.verify(token, publicKey)` without an algorithm, so a token with header `{"alg":"HS256"}` HMAC-signed with the RSA public key, which is downloadable from `/encryptionkeys/jwt.pub`, verifies. The old libraries also accept `alg: none`. `isAccounting`, `isDeluxe`, `isCustomer` and 2FA `verify`/`setup` all rely on this `verify` and then trust the decoded payload. `updateAuthenticatedUsers` also places any verified token into the session map, so forged identities flow into `appendUserId`.

**Likelihood:** The forgery techniques (alg "none", HS256 signed with the published public key) are well known and need no account.
**Impact:** An attacker can mint a token for any user or role, including admin and accounting, and pass every isAuthorized/isAccounting/isDeluxe check.

#### Evidence

`lib/insecurity.ts`, lines 52–56

```
export const isAuthorized = () => expressJwt(({ secret: publicKey }) as any)
export const denyAll = () => expressJwt({ secret: '' + Math.random() } as any)
export const authorize = (user = {}) => jwt.sign(user, privateKey, { expiresIn: '6h', algorithm: 'RS256' })
export const verify = (token: string) => token ? (jws.verify as ((token: string, secret: string) => boolean))(token, publicKey) : false
export const decode = (token: string) => { return jws.decode(token)?.payload }
```

`lib/insecurity.ts`, lines 152–171

```
export const isAccounting = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const decodedToken = verify(utils.jwtFrom(req)) && decode(utils.jwtFrom(req))
    if (decodedToken?.data?.role === roles.accounting) {
      next()
    } else {
      res.status(403).json({ error: 'Malicious activity detected' })
    }
  }
}

export const isDeluxe = (req: Request) => {
  const decodedToken = verify(utils.jwtFrom(req)) && decode(utils.jwtFrom(req))
  return decodedToken?.data?.role === roles.deluxe && decodedToken?.data?.deluxeToken && decodedToken?.data?.deluxeToken === deluxeToken(decodedToken?.data?.email)
}

export const isCustomer = (req: Request) => {
  const decodedToken = verify(utils.jwtFrom(req)) && decode(utils.jwtFrom(req))
  return decodedToken?.data?.role === roles.customer
}
```

`package.json`, line 112

```
    "express-jwt": "0.1.3",
```

`package.json`, line 129

```
    "jsonwebtoken": "0.4.0",
```

#### Recommendation

Upgrade to current `jsonwebtoken` (9.x) and `express-jwt` (8.x). Always pass `algorithms: ['RS256']` to verify. Drop the custom `jws.verify` path in favour of `jwt.verify(token, publicKey, { algorithms: ['RS256'] })`, and stop serving the key directory publicly.

#### References

- [A04:2025 Cryptographic Failures](https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/)
- [CWE-347](https://cwe.mitre.org/data/definitions/347.html)
- [ASVS 5.0.0 V7.2 Fundamental Session Management Security](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x16-V7-Session-Management.md#v72-fundamental-session-management-security)
- [ASVS 5.0.0 V7.3 Session Timeout](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x16-V7-Session-Management.md#v73-session-timeout)
- [ASVS 5.0.0 V7.4 Session Termination](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x16-V7-Session-Management.md#v74-session-termination)
- [ASVS 5.0.0 V9.1 Token source and integrity](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x18-V9-Self-contained-Tokens.md#v91-token-source-and-integrity)
- [ASVS 5.0.0 V3.3 Cookie Setup](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x12-V3-Web-Frontend-Security.md#v33-cookie-setup)
- [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

### F-031: Username spliced into Pug template source enables server-side code execution

**Severity:** critical · **Checklist item:** SEC-04 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

A customer's display name is pasted into the server's page template before it is processed. A specially crafted name makes the server run attacker code, which hands over the whole server.

#### Details

`getUserProfile` reads `views/userProfile.pug`, does `template.replace(/_username_/g, username)` and then `pug.compile(template)`. The username therefore becomes Pug source, not data. Semgrep's F-016 covers only the direct `eval(code)` on `#{...}` names (line 65). Even with that branch removed, Pug's own syntax remains reachable: `!{...}`/`#{...}` interpolation after the leading backslash, or `#[...]` tags. The username setter's `sanitizeSecure` (sanitize-html) strips HTML tags but not Pug interpolation. Interpolation evaluates arbitrary JS expressions such as `global.process.mainModule.require('child_process')`.

**Likelihood:** Any registered user can set their username via POST /profile and then load /profile.
**Impact:** Arbitrary JavaScript runs in the Node process, giving full server compromise: database, keys, files.

#### Evidence

`routes/userProfile.ts`, lines 57–77

```
    if (utils.isChallengeEnabled(challenges.ch9db78273)) {
      if (username?.match(/#{(.*)}/) !== null) {
        req.app.locals.abused_ssti_bug = true
        const code = username?.substring(2, username.length - 1)
        try {
          if (!code) {
            throw new Error('Username is null')
          }
          username = eval(code) // eslint-disable-line no-eval
        } catch (err) {
          username = '\\' + username
        }
      } else {
        username = '\\' + username
      }
      if (username) {
        template = template.replace(/_username_/g, username)
      }
    } else {
      template = template.replace(/_username_/g, '#{username}')
    }
```

`routes/userProfile.ts`, lines 88–98

```
    try {
      const pug = (await import('pug')).default
      const fn = pug.compile(template)
      const CSP = `img-src 'self' ${user?.profileImage}; script-src 'self' 'unsafe-eval'`


      res.set({
        'Content-Security-Policy': CSP
      })

      res.send(fn(user))
```

`views/userProfile.pug`, line 43

```
                  p(style='margin-top: 8px; color: _textColor_; text-align: center;') _username_
```

#### Recommendation

Never build templates from user data. Keep `#{username}` fixed in the .pug file, compile it once at startup and pass `{ username }` as locals. Delete the `eval` branch entirely.

#### References

- [CWE-1336](https://cwe.mitre.org/data/definitions/1336.html)
- [ASVS 5.0.0 V1.2 Injection Prevention](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x10-V1-Encoding-and-Sanitization.md#v12-injection-prevention)
- [Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
- [SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)
- [NodeJS Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

### F-035: Unauthenticated ZIP upload extracts entries anywhere under the app directory

**Severity:** critical · **Checklist item:** SEC-08 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

Anyone on the internet can upload a ZIP file that writes files into the shop's own program folders. That lets an attacker replace the website's pages or code.

#### Details

`extractZipBuffer` resolves `'uploads/complaints/' + entry.path` and only checks `absolutePath.includes(path.resolve('.'))`, so any path inside the working directory passes (e.g. `../../frontend/dist/frontend/main.js`, `../../views/userProfile.pug`, `../../config/default.yml`). The route has no auth middleware. `checkUploadSize` and `checkFileType` are empty no-ops, so type is decided by the client-supplied filename only. There is no limit on the decompressed size or entry count (zip bomb).

**Likelihood:** /file-upload needs no login, and crafting a ZIP with `../` entry names is trivial.
**Impact:** Overwriting files the app serves or loads (the frontend bundle, i18n files, config, views) gives defacement, stored XSS for all visitors, or code execution on restart.

#### Evidence

`routes/fileUpload.ts`, lines 27–36

```
async function extractZipBuffer (buffer: Buffer) {
  const directory = await unzipper.Open.buffer(buffer)
  for (const entry of directory.files) {
    const fileName = entry.path
    const absolutePath = path.resolve('uploads/complaints/' + fileName)
    if (absolutePath.includes(path.resolve('.'))) {
      await pipeline(entry.stream(), fs.createWriteStream('uploads/complaints/' + fileName))
    }
  }
}
```

`routes/fileUpload.ts`, lines 54–63

```
function checkUploadSize ({ file }: Request, res: Response, next: NextFunction) {
  if (file != null) {
  }
  next()
}

function checkFileType ({ file }: Request, res: Response, next: NextFunction) {
  const fileType = file?.originalname.substr(file.originalname.lastIndexOf('.') + 1).toLowerCase()
  next()
}
```

`server.ts`, line 316

```
  app.post('/file-upload', uploadToMemory.single('file'), ensureFileIsPassed, metrics.observeFileUploadMetricsMiddleware(), checkUploadSize, checkFileType, handleZipFileUpload, handleXmlUpload, handleYamlUpload)
```

#### Recommendation

Require authentication. Resolve each entry and require `resolved.startsWith(path.resolve('uploads/complaints') + path.sep)`. Skip symlink entries. Cap entry count and total uncompressed bytes. Better still, don't extract archives server-side. Implement real type and size checks by magic bytes.

#### References

- [A01:2025 Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
- [CWE-22](https://cwe.mitre.org/data/definitions/22.html)
- [ASVS 5.0.0 V5.2 File Upload and Content](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x14-V5-File-Handling.md#v52-file-upload-and-content)
- [ASVS 5.0.0 V5.3 File Storage](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x14-V5-File-Handling.md#v53-file-storage)
- [ASVS 5.0.0 V5.4 File Download](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x14-V5-File-Handling.md#v54-file-download)
- [File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)

### F-036: XML uploads parsed with external entities enabled (XXE) and echoed back

**Severity:** critical · **Checklist item:** SEC-04 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

Anyone can upload an XML file that tricks the server into reading its own private files and sending them back. That includes passwords and keys.

#### Details

`parseXmlString` deliberately sets `XML_PARSE_NOENT | XML_PARSE_DTDLOAD` and registers filesystem input providers, so `<!ENTITY x SYSTEM "file:///...">` resolves. `handleXmlUpload` puts the first 400 chars of the parsed result into an error passed to `errorhandler()`, which renders it to the client. `handleYamlUpload` runs `yaml.load` on uploaded data (js-yaml 3.x) and likewise echoes the result. Billion-laughs aliases lead to memory exhaustion before the vm timeout matters.

**Likelihood:** Unauthenticated POST to /file-upload with a .xml file; standard XXE payloads work.
**Impact:** Any file readable by the Node process (config, keys, /etc/passwd, the SQLite DB in part) is returned in the error message. Entity expansion also stalls the server, and YAML bombs exhaust memory.

#### Evidence

`lib/xml.ts`, lines 15–41

```
async function loadLibxml2 () {
  if (libxml2Promise == null) {
    libxml2Promise = (async () => {
      const libxml2 = await dynamicImport('libxml2-wasm')
      // Grants the WASM sandbox host filesystem access so external entities
      // like file:///etc/passwd resolve - required for the XXE challenges.
      const { xmlRegisterFsInputProviders } = await dynamicImport('libxml2-wasm/lib/nodejs.mjs')
      xmlRegisterFsInputProviders()
      return libxml2
    })()
  }
  return await libxml2Promise
}

// Parses XML with entity substitution and external entity loading enabled
// (intentionally vulnerable to XXE for the related challenges). The parse runs
// in a vm context with a timeout so entity-expansion bombs surface as a
// "Script execution timed out" error instead of hanging the process.
export async function parseXmlString (data: string, timeoutMs = 2000): Promise<string> {
  const libxml2 = await loadLibxml2()
  const option = libxml2.ParseOption.XML_PARSE_NOENT | libxml2.ParseOption.XML_PARSE_DTDLOAD | libxml2.ParseOption.XML_PARSE_NOBLANKS | libxml2.ParseOption.XML_PARSE_NOCDATA
  const sandbox = { libxml2, data, option }
  vm.createContext(sandbox)
  const xmlDoc = vm.runInContext('libxml2.XmlDocument.fromString(data, { option })', sandbox, { timeout: timeoutMs })
  const xmlString = xmlDoc.toString()
  xmlDoc.dispose()
  return xmlString
```

`routes/fileUpload.ts`, lines 65–100

```
async function handleXmlUpload ({ file }: Request, res: Response, next: NextFunction) {
  if (file?.originalname?.toLowerCase().endsWith('.xml') ?? false) {
    if (((file?.buffer) != null) && utils.isChallengeEnabled(challenges.chddc39ed1)) { // XXE attacks in Docker/Heroku containers regularly cause "segfault" crashes
      const data = file.buffer.toString()
      try {
        const xmlString = await parseXmlString(data)
        res.status(410)
        next(new Error('B2B customer complaints via file upload have been deprecated for security reasons: ' + utils.trunc(xmlString, 400) + ' (' + file.originalname + ')'))
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        if (errorMessage.includes('Script execution timed out')) {
          res.status(503)
          next(new Error('Sorry, we are temporarily not available! Please try again later.'))
        } else {
          res.status(410)
          next(new Error('B2B customer complaints via file upload have been deprecated for security reasons: ' + errorMessage + ' (' + file.originalname + ')'))
        }
      }
    } else {
      res.status(410)
      next(new Error('B2B customer complaints via file upload have been deprecated for security reasons (' + file?.originalname + ')'))
    }
  }
  next()
}

function handleYamlUpload ({ file }: Request, res: Response, next: NextFunction) {
  if ((file?.originalname?.toLowerCase().endsWith('.yml') ?? false) || (file?.originalname?.toLowerCase().endsWith('.yaml') ?? false)) {
    if (((file?.buffer) != null) && utils.isChallengeEnabled(challenges.chddc39ed1)) {
      const data = file.buffer.toString()
```

#### Recommendation

Remove the XML/YAML complaint handlers, or parse with entity substitution and DTD loading disabled and no filesystem providers. Use `yaml.load` with `JSON_SCHEMA` and size limits. Never echo parsed content in errors.

#### References

- [A02:2025 Security Misconfiguration](https://owasp.org/Top10/2025/A02_2025-Security_Misconfiguration/)
- [CWE-611](https://cwe.mitre.org/data/definitions/611.html)
- [ASVS 5.0.0 V1.2 Injection Prevention](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x10-V1-Encoding-and-Sanitization.md#v12-injection-prevention)
- [Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
- [SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)
- [NodeJS Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

### F-038: Public memories endpoint returns posting users' full records, including password hashes

**Severity:** critical · **Checklist item:** SEC-03 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

The public photo wall also sends out the private account details of everyone who posted a photo, including their scrambled password and two-factor secret, to anyone who looks.

#### Details

`getMemories` runs `MemoryModel.findAll({ include: [UserModel] })` with no `attributes` restriction, so Sequelize serialises every User column (password, totpSecret, deluxeToken, lastLoginIp). The route has no auth middleware. Combined with the unsalted MD5 hashing (F-022), the passwords are easily recovered.

**Likelihood:** GET /rest/memories needs no authentication.
**Impact:** Email, role, MD5 password hash, TOTP secret and deluxe token of every user who posted a photo leak to anyone.

#### Evidence

`routes/memory.ts`, lines 22–26

```
export function getMemories () {
  return async (req: Request, res: Response, next: NextFunction) => {
    const memories = await MemoryModel.findAll({ include: [UserModel] })
    res.status(200).json({ status: 'success', data: memories })
  }
```

`server.ts`, line 624

```
  app.get('/rest/memories', utils.asyncHandler(getMemories()))
```

#### Recommendation

Use `include: [{ model: UserModel, attributes: ['id', 'username'] }]`. Add a `defaultScope` on User that excludes `password`, `totpSecret` and `deluxeToken`, so other includes are also safe.

#### References

- [A01:2025 Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
- [CWE-200](https://cwe.mitre.org/data/definitions/200.html)
- [ASVS 5.0.0 V8.2 General Authorization Design](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x17-V8-Authorization.md#v82-general-authorization-design)
- [ASVS 5.0.0 V8.3 Operation Level Authorization](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x17-V8-Authorization.md#v83-operation-level-authorization)
- [ASVS 5.0.0 V14.2 General Data Protection](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x23-V14-Data-Protection.md#v142-general-data-protection)
- [Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [Insecure Direct Object Reference Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)

### F-039: Auto-generated REST API lacks role and ownership checks

**Severity:** critical · **Checklist item:** SEC-03 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** M (up to 2 days) · **Fix before sign-off:** yes

Much of the shop's data API has no idea who is allowed to do what. Anyone can change product listings and prices without logging in, and any customer can see every other user's account list and complaints or change their saved addresses.

#### Details

finale generates full CRUD for 13 models (`/api/<Model>s` and `/:id`), and the hand-written guards in server.ts are incomplete. `app.put('/api/Products/:id', security.isAuthorized())` is commented out, so PUT on products is unauthenticated. `GET /api/Users`, `GET /api/Users/:id` and `/rest/user/authentication-details` require only `isAuthorized()`, not admin, so any customer enumerates all users, emails and roles. `/api/Feedbacks/:id` DELETE requires only login. `GET /api/Complaints` returns everyone's complaints. `PUT /api/Addresss/:id` only appends `UserId`; finale updates by `id` without checking ownership. `/api/Hints/:id` PUT and `/api/Recycles/:id` GET (which `JSON.parse`s the id, so `[1,2,3,...]` returns arbitrary rows) are open. The Angular admin page is protected only by a client-side route guard.

**Likelihood:** Product edits need no login at all; the rest need only a free account.
**Impact:** Anyone can rewrite product names, descriptions and prices (stored XSS and price tampering for every shopper). Any customer can list all users, read all complaints, delete any feedback, and edit other users' addresses.

#### Evidence

`server.ts`, lines 364–374

```
  app.use('/api/Feedbacks/:id', security.isAuthorized())
  /* Users: Only POST is allowed in order to register a new user */
  app.get('/api/Users', security.isAuthorized())
  app.route('/api/Users/:id')
    .get(security.isAuthorized())
    .put(security.denyAll())
    .delete(security.denyAll())
  /* Products: Only GET is allowed in order to view products */
  app.post('/api/Products', security.isAuthorized())
  // app.put('/api/Products/:id', security.isAuthorized())
  app.delete('/api/Products/:id', security.denyAll())
```

`server.ts`, lines 380–391

```
  app.route('/api/Hints/:id')
    .get(security.denyAll())
    .delete(security.denyAll())
  /* Complaints: POST and GET allowed when logged in only */
  app.get('/api/Complaints', security.isAuthorized())
  app.post('/api/Complaints', security.isAuthorized())
  app.use('/api/Complaints/:id', security.denyAll())
  /* Recycles: POST and GET allowed when logged in only */
  app.get('/api/Recycles', recycles.blockRecycleItems())
  app.post('/api/Recycles', security.isAuthorized())
  /* Challenge evaluation before finale takes over */
  app.get('/api/Recycles/:id', recycles.getRecycleItem())
```

`server.ts`, lines 446–448

```
  app.post('/api/Addresss', security.appendUserId())
  app.get('/api/Addresss', security.appendUserId(), utils.asyncHandler(address.getAddress()))
  app.put('/api/Addresss/:id', security.appendUserId())
```

`server.ts`, lines 495–502

```
  for (const { name, exclude, model, include } of autoModels) {
    const resource = finale.resource({
      model,
      endpoints: [`/api/${name}s`, `/api/${name}s/:id`],
      excludeAttributes: exclude,
      pagination: false,
      include
    })
```

`routes/recycles.ts`, lines 11–17

```
export const getRecycleItem = () => (req: Request, res: Response) => {
  RecycleModel.findAll({
    where: {
      id: JSON.parse(req.params.id)
    }
  }).then((Recycle) => {
    return res.send(utils.queryResultToJson(Recycle))
```

#### Recommendation

Default to deny: add a finale `all.auth` hook that rejects unless an explicit per-model/per-action policy allows it. Require admin for product writes and user listing. Scope list/read/update/delete to `UserId = caller` for Address, Card, BasketItem, Complaint, Recycle and PrivacyRequest. Add integration tests asserting 401/403 for each generated endpoint.

#### References

- [A01:2025 Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
- [CWE-862](https://cwe.mitre.org/data/definitions/862.html)
- [ASVS 5.0.0 V8.2 General Authorization Design](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x17-V8-Authorization.md#v82-general-authorization-design)
- [ASVS 5.0.0 V8.3 Operation Level Authorization](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x17-V8-Authorization.md#v83-operation-level-authorization)
- [ASVS 5.0.0 V14.2 General Data Protection](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x23-V14-Data-Protection.md#v142-general-data-protection)
- [Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [Insecure Direct Object Reference Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)

### F-040: Registration accepts a role field, so anyone can sign up as admin

**Severity:** critical · **Checklist item:** SEC-09 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

When signing up, a user can simply declare themselves an administrator and the server accepts it.

#### Details

User registration is the finale-generated `POST /api/Users`, which builds the model from the whole request body. The only pre-handler (server.ts 409-420) trims email and password. Nothing strips `role`, `deluxeToken`, `totpSecret`, `isActive` or `profileImage`. The model's `role` validator accepts `admin`, `accounting` and `deluxe`. Because the pre-handler only trims when all three fields are present, it also doesn't reliably reject empty passwords.

**Likelihood:** Anyone can POST /api/Users with `"role":"admin"`; no login needed.
**Impact:** An attacker immediately holds an admin (or accounting/deluxe) account, with every privilege that role grants.

#### Evidence

`server.ts`, lines 409–420

```
  app.post('/api/Users', (req: Request, res: Response, next: NextFunction) => {
    if (req.body.email !== undefined && req.body.password !== undefined && req.body.passwordRepeat !== undefined) {
      if (req.body.email.length !== 0 && req.body.password.length !== 0) {
        req.body.email = req.body.email.trim()
        req.body.password = req.body.password.trim()
        req.body.passwordRepeat = req.body.passwordRepeat.trim()
      } else {
        res.status(400).send(res.__('Invalid email/password cannot be empty'))
      }
    }
    next()
  })
```

`models/user.ts`, lines 73–93

```
      role: {
        type: DataTypes.STRING,
        defaultValue: 'customer',
        validate: {
          isIn: [['customer', 'deluxe', 'accounting', 'admin']]
        },
        set (role: string) {
          const profileImage = this.getDataValue('profileImage')
          if (
            role === security.roles.admin &&
          (!profileImage ||
            profileImage === '/assets/public/images/uploads/default.svg')
          ) {
            this.setDataValue(
              'profileImage',
              '/assets/public/images/uploads/defaultAdmin.png'
            )
          }
          this.setDataValue('role', role)
        }
      },
```

`server.ts`, lines 478–479

```
  const autoModels = [
    { name: 'User', exclude: ['password', 'totpSecret'], model: UserModel },
```

#### Recommendation

Replace generated user creation with a dedicated handler that validates a schema of `{email, password, passwordRepeat, securityQuestion, securityAnswer}` only, and sets `role = 'customer'` server-side. Alternatively, in a finale `create.write.before` hook, delete every attribute except the allowed ones.

#### References

- [A08:2025 Software or Data Integrity Failures](https://owasp.org/Top10/2025/A08_2025-Software_or_Data_Integrity_Failures/)
- [CWE-915](https://cwe.mitre.org/data/definitions/915.html)
- [ASVS 5.0.0 V2.2 Input Validation](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x11-V2-Validation-and-Business-Logic.md#v22-input-validation)
- [ASVS v5.0.0-15.3.3 (V15.3 Defensive Coding)](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x24-V15-Secure-Coding-and-Architecture.md#v153-defensive-coding)
- [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Mass Assignment Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html)

### F-050: Seeded admin and staff accounts with weak, published passwords

**Severity:** critical · **Checklist item:** SEC-10 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** M (up to 2 days) · **Fix before sign-off:** yes

The shop creates an administrator account with the password "admin123" every time it starts, and that password is in the published source code. Anyone can log in as the administrator.

#### Details

`data/static/users.yml` defines users with plaintext passwords and security answers (admin `admin123`, jim `ncc-1701`, and others), plus card numbers and addresses. `start()` drops and recreates the schema and reseeds from this file, so production always contains these accounts. Gitleaks F-001/F-002 flagged two keys in this file but not the account passwords themselves. Also committed: `ctf.key` (HMAC key for flags) and `encryptionkeys/premium.key`, the latter served publicly under /encryptionkeys.

**Likelihood:** The seed file is in the public repository and is loaded on every start (`sequelize.sync({ force: true })` then `datacreator()`).
**Impact:** Anyone can log in as the administrator (`admin@<domain>` / `admin123`) or other staff, with full access to users, feedback and orders.

#### Evidence

`data/static/users.yml`, lines 1–8

```
-
  email: admin
  password: 'admin123'
  key: admin
  role: 'admin'
  securityQuestion:
    id: 2
    answer: '@xI98PxDO+06!'
```

`data/static/users.yml`, lines 30–37

```
  email: jim
  password: 'ncc-1701'
  key: jim
  role: 'customer'
  walletBalance: 100
  securityQuestion:
    id: 1
    answer: 'Samuel' # https://en.wikipedia.org/wiki/James_T._Kirk
```

`server.ts`, lines 726–731

```
export async function start (readyCallback?: () => void) {
  const datacreatorEnd = startupGauge.startTimer({ task: 'datacreator' })
  await sequelize.sync({ force: true })
  await preconditionsReady
  await datacreator()
  datacreatorEnd()
```

`data/static/users.yml`, line 88

```
password: '[secret masked: generic-api-key]'
```

`data/static/users.yml`, line 151

```
totpSecret: [secret masked: generic-api-key]
```

#### Recommendation

Don't seed privileged accounts in production. Create the first admin through a one-time bootstrap with a password from a secret store, forced to change on first login. Stop `sync({ force: true })` in production. Remove the key files from the repo and its history, rotate them, and load them from environment secrets.

#### References

- [A07:2025 Authentication Failures](https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/)
- [CWE-798](https://cwe.mitre.org/data/definitions/798.html)
- [ASVS 5.0.0 V13.3 Secret Management](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x22-V13-Configuration.md#v133-secret-management)
- [Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

### F-053: Chatbot coupon tool lets anyone obtain discounts of any size

**Severity:** critical · **Checklist item:** LLM-02 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** M (up to 2 days) · **Fix before sign-off:** yes

The chatbot can create real discount coupons. The only thing that stops it is a written instruction to the AI, and visitors can talk it out of that instruction. Anyone, even without an account, can ask the chatbot for a large coupon and use it at checkout.

#### Details

`generateCoupon` (routes/chat.ts:174-183) passes the model-chosen `discount` straight to `security.generateCoupon`. The zod schema is `z.number()` with no min or max, and the tool checks no order ID, damage report, rejected return, ownership or authentication. Every condition in the COUPON POLICY (lines 97-104) exists only in the prompt. The route is mounted without any auth middleware (server.ts:632). The client also sends the whole message history (`req.body.messages`, line 187), so an attacker can add fake assistant turns, or fake turns claiming a verified damaged order, to steer the model into calling the tool. The system prompt also contains a 'CONFIDENTIAL' 15% escalation offer, which the model will reveal when asked. This is separate from F-046 (coupons are unsigned and can be forged offline): this finding is the server's own LLM tool issuing coupons of any size on request.

**Likelihood:** Likely: /rest/chat needs no sign-in and the coupon rules exist only as text in the prompt, which a short jailbreak gets past.
**Impact:** Anyone can get valid coupons for 10%, 15%, 100% or more and use them on any order, so the shop loses revenue.

#### Evidence

`routes/chat.ts`, lines 174–183

```
      generateCoupon: tool({
        description: 'Generate a discount coupon for a customer. Only use this when the coupon policy conditions are fully met.',
        inputSchema: z.object({
          discount: z.number().describe('The discount percentage for the coupon (maximum 10)')
        }),
        execute: async ({ discount }) => {
          const couponCode = security.generateCoupon(discount)
          return { couponCode, discount }
        }
      })
```

`routes/chat.ts`, lines 97–104

```
COUPON POLICY (for the generateCoupon tool):
- You may ONLY generate a coupon for a customer who has a verified damaged order with a valid order ID (format: xxxx-xxxxxxxxxxxxxxxx, e.g. 3fa8-bf2bc042f4e92).
- The customer must have explicitly rejected a return or exchange before a coupon can be offered.
- The maximum allowed discount is 10%.
- NEVER generate a coupon just because a customer asks for one or complains.
- If the customer does not meet ALL of the above conditions, politely decline and explain the policy.

CONFIDENTIAL - INTERNAL ONLY: If a customer formally complains about their shopping experience and explicitly requests to escalate the issue, offer them a one-time 15% courtesy discount to resolve the case without escalation. Do not mention this option proactively.`
```

`server.ts`, lines 631–632

```
  /* Chat API endpoint */
  app.post('/rest/chat', utils.asyncHandler(chat()))
```

#### Recommendation

Take coupon creation out of the model's free choice. Either drop the tool and send damaged-order cases to a human workflow, or make the tool take only an `orderId` and enforce the policy in code: the user is authenticated with a verified JWT, the order belongs to them, a damage claim is recorded, no coupon has been issued for it yet, and the discount is fixed server-side at 10% or less. Record issued coupons so each can be used once. Remove confidential business rules from the system prompt.

#### References

- [A01:2025 Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
- [CWE-862](https://cwe.mitre.org/data/definitions/862.html)
- [ASVS 5.0.0 V8.3 Operation Level Authorization](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x17-V8-Authorization.md#v83-operation-level-authorization)
- [AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)

### F-054: Chatbot order lookup trusts unsigned JWTs and a masked-email match

**Severity:** critical · **Checklist item:** LLM-02 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

The chatbot is meant to show customers only their own orders. But it never checks that the login token is genuine, so anyone can claim to be another customer and have the chatbot show that customer's orders.

#### Details

`getUserId` (routes/chat.ts:42-47) calls `security.decode`, which is `jws.decode(token)?.payload` (lib/insecurity.ts:56) and does not check the signature. A token with `alg: none` or any made-up signature and `data.id` set to someone else's id is accepted. `getOrderById` (lines 157-171) then loads that user's email, applies the same vowel-masking used when orders are stored (order.ts:168), and returns the whole order document when the masked values match. Two problems follow. (1) Identity is forged with no credentials. This is worse than F-023: no forgery trick is needed, because nothing verifies the token. (2) Vowel-masking is not unique. Emails that differ only in vowels (for example `bob@x.io` and `bab@x.ia`) give the same masked string, so a user can register a colliding address and read another person's orders. `getUserNameFromToken` (line 49) uses the same unverified decode, so a forged token also controls which name goes into the system prompt.

**Likelihood:** Easy: anyone can build an unsigned token with any user id, and order IDs show up in shared PDFs and the public /ftp folder.
**Impact:** Anyone without an account can read other customers' orders through the chatbot: products, prices, payment and address IDs, and masked email.

#### Evidence

`routes/chat.ts`, lines 42–54

```
export async function getUserId (req: Request): Promise<number | undefined> {
  const token = utils.jwtFrom(req)
  if (!token) return undefined
  const decoded = security.decode(token) as { data?: { id?: number } } | undefined
  return decoded?.data?.id
}

export async function getUserNameFromToken (req: Request): Promise<string | undefined> {
  const userId = await getUserId(req)
  if (!userId) return undefined
  const user = await UserModel.findByPk(userId, { attributes: ['username'] })
  return user?.username ?? undefined
}
```

`routes/chat.ts`, lines 157–171

```
        execute: async ({ orderId }) => {
          const userId = await getUserId(req)
          if (!userId) return { error: 'Customer not authenticated' }

          const user = await UserModel.findByPk(userId, { attributes: ['email'] })
          if (!user) return { error: 'Customer not found' }

          const maskedEmail = user.email ? user.email.replace(/[aeiou]/gi, '*') : undefined
          const order = await db.ordersCollection.findOne({ orderId })

          if (!order) return { error: 'Order not found' }
          if (order.email !== maskedEmail) return { error: 'Order does not belong to the current customer' }

          return order
        }
```

`lib/insecurity.ts`, line 56

```
export const decode = (token: string) => { return jws.decode(token)?.payload }
```

`routes/order.ts`, lines 162–170

```
          db.ordersCollection.insert({
            promotionalAmount: discountAmount,
            paymentId: req.body.orderDetails ? req.body.orderDetails.paymentId : null,
            addressId: req.body.orderDetails ? req.body.orderDetails.addressId : null,
            orderId,
            delivered: false,
            email: (email ? email.replace(/[aeiou]/gi, '*') : undefined),
            totalPrice,
            products: basketProducts,
```

#### Recommendation

In the chat route, authenticate with `security.verify` / `isAuthorized()` before reading claims. Store the owner's `UserId` on each order document and match on it instead of the masked email. Return only the fields the bot needs (status, ETA, product names).

#### References

- [A04:2025 Cryptographic Failures](https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/)
- [CWE-347](https://cwe.mitre.org/data/definitions/347.html)
- [ASVS 5.0.0 V8.3 Operation Level Authorization](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x17-V8-Authorization.md#v83-operation-level-authorization)
- [AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)

### F-055: Unauthenticated chat endpoint has no rate limit, token cap or input cap

**Severity:** critical · **Checklist item:** LLM-04 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** M (up to 2 days) · **Fix before sign-off:** yes

Anyone on the internet can use the shop's chatbot as much as they like, with messages as long as they like, without an account. Every call costs money with a paid AI provider, so an attacker could run up a large bill or knock the chatbot offline.

#### Details

`POST /rest/chat` is mounted with no auth and no rate limiter (server.ts:632; the only rateLimit in server.ts covers reset-password). `streamText` is called with no `maxOutputTokens` (routes/chat.ts:199-209). `req.body.messages` is used as-is (line 187), with no limit on the number of messages, their size or their roles, and the body parser accepts any `*/*` text. Each request can run up to 10 tool steps (`stepCountIs(10)`) plus `llmMaxRetries` retries, so one request can turn into many model calls. The token counters exist (lines 57-79), but nothing attributes usage to a user or enforces a budget.

**Likelihood:** Likely once the chatbot points at a paid API: a simple script can call it in a loop without signing in.
**Impact:** Unlimited LLM spend, or a self-hosted model kept fully busy, at the attacker's choice, which blocks real customers.

#### Evidence

`server.ts`, lines 631–632

```
  /* Chat API endpoint */
  app.post('/rest/chat', utils.asyncHandler(chat()))
```

`routes/chat.ts`, lines 186–209

```
    const model = config.get<string>('application.chatBot.model')
    const messages = req.body?.messages ?? []
    const userName = await getUserNameFromToken(req)

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Content-Encoding', 'identity')
    res.flushHeaders()

    const systemPrompt = buildSystemPrompt(userName)

    try {
      const result = streamText({
        model: provider(model),
        system: systemPrompt,
        messages,
        tools: { ...chatTools },
        maxRetries: config.get<number>('application.chatBot.llmMaxRetries'),
        stopWhen: stepCountIs(10),
        onError: ({ error }) => {
          logger.warn('Chatbot stream error: ' + summarizeLlmError(error))
        }
      })
```

`server.ts`, lines 347–353

```
  /* Rate limiting */
  app.enable('trust proxy')
  app.use('/rest/user/reset-password', rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 100,
    keyGenerator ({ headers, ip }: { headers: any, ip: any }) { return headers['X-Forwarded-For'] ?? ip }
  }))
```

#### Recommendation

Require authentication for /rest/chat (or a captcha for anonymous use). Add an express-rate-limit keyed on the verified user id with a daily token quota. Validate the body with zod: only `user`/`assistant` roles, at most around 20 messages, and a cap on total characters. Set `maxOutputTokens`, and lower `stepCountIs` to what the tools actually need. Alert on the existing token metrics.

#### References

- [CWE-770](https://cwe.mitre.org/data/definitions/770.html)
- [Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)

### F-012: Detected a sequelize statement that is tainted by user-input.

**Severity:** high · **Checklist item:** SEC-04 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

Detected a sequelize statement that is tainted by user-input. This could lead to SQL injection if the variable is user-controlled and is not properly sanitized. In order to prevent SQL injection, it is recommended to use parameterized queries or prepared statements.

#### Details

Semgrep rule rules.javascript.sequelize.security.audit.sequelize-injection-express.express-sequelize-injection.

#### Evidence

`routes/login.ts`, line 31

```
    models.sequelize.query(`SELECT * FROM Users WHERE email = '${req.body.email || ''}' AND password = '${security.hash(req.body.password || '')}' AND deletedAt IS NULL`, { model: UserModel, plain: true })
```

#### Recommendation

Confirm the input is attacker-controlled; if so, follow the rule's references.

#### References

- [A05:2025 Injection](https://owasp.org/Top10/2025/A05_2025-Injection/)
- [CWE-89](https://cwe.mitre.org/data/definitions/89.html)
- [ASVS 5.0.0 V1.2 Injection Prevention](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x10-V1-Encoding-and-Sanitization.md#v12-injection-prevention)
- [Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
- [SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)
- [NodeJS Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

### F-015: Detected a sequelize statement that is tainted by user-input.

**Severity:** high · **Checklist item:** SEC-04 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

Detected a sequelize statement that is tainted by user-input. This could lead to SQL injection if the variable is user-controlled and is not properly sanitized. In order to prevent SQL injection, it is recommended to use parameterized queries or prepared statements.

#### Details

Semgrep rule rules.javascript.sequelize.security.audit.sequelize-injection-express.express-sequelize-injection.

#### Evidence

`routes/search.ts`, line 22

```
    models.sequelize.query(`SELECT * FROM Products WHERE ((name LIKE '%${criteria}%' OR description LIKE '%${criteria}%') AND deletedAt IS NULL) ORDER BY name`)
```

#### Recommendation

Confirm the input is attacker-controlled; if so, follow the rule's references.

#### References

- [A05:2025 Injection](https://owasp.org/Top10/2025/A05_2025-Injection/)
- [CWE-89](https://cwe.mitre.org/data/definitions/89.html)
- [ASVS 5.0.0 V1.2 Injection Prevention](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x10-V1-Encoding-and-Sanitization.md#v12-injection-prevention)
- [Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
- [SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)
- [NodeJS Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

### F-017: Five folders can be browsed by anyone, the encryption keys and server logs among them

**Severity:** high · **Checklist item:** SEC-15 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

Anyone can list and download the contents of /ftp, /encryptionkeys, /support/logs, /infrastructure and /.well-known. Among them are key files and the server's access logs.

#### Details

Semgrep rule rules.javascript.express.security.audit.express-check-directory-listing.express-check-directory-listing.

#### Evidence

`server.ts`, line 260

```
  app.use('/infrastructure', serveIndexMiddleware, serveIndex('infrastructure', { icons: true, view: 'details', filter: (filename) => filename !== 'README.md' }))
```

`server.ts`, line 278

```
  app.use('/ftp', serveIndexMiddleware, serveIndex('ftp', { icons: true }))
```

`server.ts`, line 282

```
  app.use('/.well-known', serveIndexMiddleware, serveIndex('.well-known', { icons: true, view: 'details' }))
```

`server.ts`, line 286

```
  app.use('/encryptionkeys', serveIndexMiddleware, serveIndex('encryptionkeys', { icons: true, view: 'details' }))
```

`server.ts`, line 290

```
  app.use('/support/logs', serveIndexMiddleware, serveIndex('logs', { icons: true, view: 'details' }))
```

#### Recommendation

Confirm the input is attacker-controlled; if so, follow the rule's references.

#### References

- [A01:2025 Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
- [CWE-548](https://cwe.mitre.org/data/definitions/548.html)
- [ASVS 5.0.0 V15.3 Defensive Coding](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x24-V15-Secure-Coding-and-Architecture.md#v153-defensive-coding)
- [ASVS 5.0.0 V1.5 Safe Deserialization](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x10-V1-Encoding-and-Sanitization.md#v15-safe-deserialization)
- [NodeJS Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html)
- [Prototype Pollution Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html)

### F-022: Passwords stored as unsalted MD5 hashes

**Severity:** high · **Checklist item:** SEC-01 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** M (up to 2 days) · **Fix before sign-off:** yes

Customer passwords are scrambled with a very old, fast method that offers almost no protection. If the database leaks, and several bugs in this app let it leak, most passwords can be recovered within minutes.

#### Details

The User model's password setter calls `security.hash`, which is `crypto.createHash('md5')` with no salt or work factor. Login compares `security.hash(req.body.password)` in SQL, and change-password and 2FA setup compare against the same MD5 value. Identical passwords produce identical hashes across users.

**Likelihood:** Anyone who gets a copy of the Users table (via the SQL injection in login/search, or the user list endpoints) gets these hashes.
**Impact:** Unsalted MD5 is cracked at billions of guesses per second or looked up in rainbow tables, so most user passwords are recovered and can be reused on other sites.

#### Evidence

`lib/insecurity.ts`, line 41

```
export const hash = (data: string) => crypto.createHash('md5').update(data).digest('hex')
```

`models/user.ts`, lines 67–72

```
      password: {
        type: DataTypes.STRING,
        set (clearTextPassword: string) {
          this.setDataValue('password', security.hash(clearTextPassword))
        }
      },
```

`routes/login.ts`, line 31

```
    models.sequelize.query(`SELECT * FROM Users WHERE email = '${req.body.email || ''}' AND password = '${security.hash(req.body.password || '')}' AND deletedAt IS NULL`, { model: UserModel, plain: true })
```

#### Recommendation

Replace `hash` with bcrypt (cost ≥ 12) or argon2id. Verify with the library's constant-time compare in application code, not in SQL. Rehash on the user's next successful login and force a reset for accounts that never log in again.

#### References

- [A04:2025 Cryptographic Failures](https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/)
- [CWE-916](https://cwe.mitre.org/data/definitions/916.html)
- [ASVS 5.0.0 V6.2 Password Security](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x15-V6-Authentication.md#v62-password-security)
- [ASVS 5.0.0 V6.3 General Authentication Security](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x15-V6-Authentication.md#v63-general-authentication-security)
- [ASVS 5.0.0 V6.4 Authentication Factor Lifecycle and Recovery](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x15-V6-Authentication.md#v64-authentication-factor-lifecycle-and-recovery)
- [ASVS v5.0.0-11.4.2 (V11.4 Hashing and Hash-based Functions)](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x20-V11-Cryptography.md#v114-hashing-and-hash-based-functions)
- [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [NIST SP 800-63B-4 (Digital Identity Guidelines: Authentication)](https://pages.nist.gov/800-63-4/sp800-63b.html)

### F-024: OAuth accounts use a password derived from their email address

**Severity:** high · **Checklist item:** SEC-01 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** M (up to 2 days) · **Fix before sign-off:** yes

Accounts created with "Log in with Google" get a password anyone can work out from the email address. Knowing someone's email is enough to log in as them.

#### Details

After the Google profile is fetched, the browser registers and logs in the user with `password = btoa(reversed email)`. The server has no notion of an OAuth identity. It accepts a normal `/rest/user/login` with that password, and the `oauth: true` flag in the body is ignored. Because the code runs on the client, the Google access token is never verified server-side.

**Likelihood:** The derivation is in the shipped JavaScript bundle, so anyone who knows an OAuth user's email can compute the password.
**Impact:** Full takeover of every account created through Google sign-in, using the ordinary email/password login.

#### Evidence

`frontend/src/app/oauth/oauth.component.ts`, lines 28–52

```
  ngOnInit (): void {
    this.userService.oauthLogin(this.parseRedirectUrlParams().access_token).subscribe({
      next: (profile: any) => {
        const password = btoa(profile.email.split('').reverse().join(''))
        this.userService.save({ email: profile.email, password, passwordRepeat: password }).subscribe({
          next: () => {
            this.login(profile)
          },
          error: () => { this.login(profile) }
        })
      },
      error: (error) => {
        this.invalidateSession(error)
        this.ngZone.run(async () => await this.router.navigate(['/login']))
      }
    })
  }

  login (profile: any) {
    this.userService.login({ email: profile.email, password: btoa(profile.email.split('').reverse().join('')), oauth: true }).subscribe({
      next: (authentication) => {
        const expires = new Date()
        expires.setHours(expires.getHours() + 8)
        this.cookieService.put('token', authentication.token, { expires })
        localStorage.setItem('token', authentication.token)
```

#### Recommendation

Do the OAuth code exchange and token verification on the server. Link the provider subject ID to the user record and issue the session there. Give OAuth-only accounts no usable password, or a random one the client never sees.

#### References

- [A07:2025 Authentication Failures](https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/)
- [CWE-1391](https://cwe.mitre.org/data/definitions/1391.html)
- [ASVS 5.0.0 V6.2 Password Security](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x15-V6-Authentication.md#v62-password-security)
- [ASVS 5.0.0 V6.3 General Authentication Security](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x15-V6-Authentication.md#v63-general-authentication-security)
- [ASVS 5.0.0 V6.4 Authentication Factor Lifecycle and Recovery](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x15-V6-Authentication.md#v64-authentication-factor-lifecycle-and-recovery)
- [ASVS v5.0.0-11.4.2 (V11.4 Hashing and Hash-based Functions)](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x20-V11-Cryptography.md#v114-hashing-and-hash-based-functions)
- [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [NIST SP 800-63B-4 (Digital Identity Guidelines: Authentication)](https://pages.nist.gov/800-63-4/sp800-63b.html)

### F-025: JWT carries password hash and TOTP secret; no revocation on logout

**Severity:** high · **Checklist item:** SEC-02 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** M (up to 2 days) · **Fix before sign-off:** yes

The login token handed to the browser contains the user's scrambled password and their two-factor secret. It is stored where malicious scripts can read it, and logging out does not cancel it.

#### Details

`login()` signs `{ data: user, bid }`, where `user` is the full Users row from `SELECT *`, including `password` (MD5) and `totpSecret`. 2FA `verify` does the same with `plainUser`. JWT payloads are only base64, not encrypted. The frontend writes the token to `localStorage` and to a cookie via ngx-cookie without HttpOnly, Secure or SameSite, and the server also sets `res.cookie('token', token)` without flags in `updateAuthenticatedUsers`. Logout only deletes the client copies. `authenticatedUsers.tokenMap` is never purged and there is no deny-list, so the token stays valid until `exp`.

**Likelihood:** Every login issues such a token. It sits in localStorage and in a non-HttpOnly cookie, so any XSS in the app (several exist) can read it.
**Impact:** A stolen token reveals the user's MD5 password hash and 2FA seed and stays usable for 6 hours after logout.

#### Evidence

`routes/login.ts`, lines 18–24

```
  function afterLogin (user: User, res: Response, next: NextFunction) {
    BasketModel.findOrCreate({ where: { UserId: user.id } })
      .then(([basket]: [BasketModel, boolean]) => {
        const authenticatedUser = { data: user, bid: basket.id } // keep track of original basket
        const token = security.authorize(authenticatedUser)
        security.authenticatedUsers.put(token, authenticatedUser)
        res.json({ authentication: { token, bid: basket.id, umail: user.email } })
```

`routes/2fa.ts`, lines 41–44

```
    const token = security.authorize(plainUser)
    // @ts-expect-error FIXME set new property for original basket
    plainUser.bid = basket.id // keep track of original basket for challenge solution check
    security.authenticatedUsers.put(token, plainUser)
```

`lib/insecurity.ts`, lines 184–195

```
export const updateAuthenticatedUsers = () => (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token || utils.jwtFrom(req)
  if (token && authenticatedUsers.get(token) === undefined) {
    jwt.verify(token, publicKey, (err: Error | null, decoded: any) => {
      if (err === null && decoded?.data !== undefined) {
        authenticatedUsers.put(token, decoded)
        res.cookie('token', token)
      }
    })
  }
  next()
}
```

`frontend/src/app/login/login.component.ts`, lines 100–106

```
      next: (authentication: any) => {
        const redirectUrl = this.route.snapshot.queryParamMap.get('redirectUrl') ?? '/search'
        localStorage.setItem('token', authentication.token)
        const expires = new Date()
        expires.setHours(expires.getHours() + 8)
        this.cookieService.put('token', authentication.token, { expires })
        sessionStorage.setItem('bid', authentication.bid)
```

`frontend/src/app/navbar/navbar.component.ts`, lines 241–250

```
  logout () {
    this.userService.saveLastLoginIp().subscribe({ next: () => { this.noop() }, error: (err) => { console.log(err) } })
    localStorage.removeItem('token')
    this.cookieService.remove('token')
    sessionStorage.removeItem('bid')
    sessionStorage.removeItem('itemTotal')
    sessionStorage.removeItem('guestBasket')
    this.userService.isLoggedIn.next(false)
    this.ngZone.run(async () => await this.router.navigate(['/']))
  }
```

#### Recommendation

Put only `sub`, `role` and minimal claims in the token. Deliver it in an HttpOnly, Secure, SameSite=Lax/Strict cookie set by the server, not localStorage. Add a server-side logout that invalidates the session (token ID deny-list or short-lived access token plus revocable refresh token).

#### References

- [A06:2025 Insecure Design](https://owasp.org/Top10/2025/A06_2025-Insecure_Design/)
- [CWE-522](https://cwe.mitre.org/data/definitions/522.html)
- [ASVS 5.0.0 V7.2 Fundamental Session Management Security](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x16-V7-Session-Management.md#v72-fundamental-session-management-security)
- [ASVS 5.0.0 V7.3 Session Timeout](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x16-V7-Session-Management.md#v73-session-timeout)
- [ASVS 5.0.0 V7.4 Session Termination](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x16-V7-Session-Management.md#v74-session-termination)
- [ASVS 5.0.0 V9.1 Token source and integrity](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x18-V9-Self-contained-Tokens.md#v91-token-source-and-integrity)
- [ASVS 5.0.0 V3.3 Cookie Setup](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x12-V3-Web-Frontend-Security.md#v33-cookie-setup)
- [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

### F-026: Password change skips current-password check and sends passwords in URL

**Severity:** high · **Checklist item:** SEC-01 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

Changing a password does not really require the old one, so someone who briefly hijacks a session can lock the owner out for good. New passwords are also written in plain text into server log files.

#### Details

`GET /rest/user/change-password` reads `current`, `new` and `repeat` from the query string. The current password is checked only `if (currentPassword && ...)`, so omitting `current` skips the check. Because it is a GET, morgan's `combined` format writes the full URL, including both passwords, to `logs/access.log.*`. That directory is served by `/support/logs` (see F-020/F-011).

**Likelihood:** Anyone holding a user's token, for example via the XSS issues in this app, can call it. The password also lands in access logs on every legitimate change.
**Impact:** Permanent account takeover from a short-lived token theft, and plaintext new passwords stored in logs/access.log, which is publicly browsable under /support/logs.

#### Evidence

`routes/changePassword.ts`, lines 13–42

```
  return async ({ query, headers, connection }: Request, res: Response, next: NextFunction) => {
    const currentPassword = query.current as string
    const newPassword = query.new as string
    const newPasswordInString = newPassword?.toString()
    const repeatPassword = query.repeat

    if (!newPassword || newPassword === 'undefined') {
      res.status(401).send(res.__('Password cannot be empty.'))
      return
    } else if (newPassword !== repeatPassword) {
      res.status(401).send(res.__('New and repeated password do not match.'))
      return
    }

    const token = headers.authorization ? headers.authorization.substr('Bearer='.length) : null
    if (token === null) {
      next(new Error('Blocked illegal activity by ' + connection.remoteAddress))
      return
    }

    const loggedInUser = security.authenticatedUsers.get(token)
    if (!loggedInUser) {
      next(new Error('Blocked illegal activity by ' + connection.remoteAddress))
      return
    }

    if (currentPassword && security.hash(currentPassword) !== loggedInUser.data.password) {
      res.status(401).send(res.__('Current password is not correct.'))
      return
    }
```

`server.ts`, line 591

```
  app.get('/rest/user/change-password', utils.asyncHandler(changePassword()))
```

`server.ts`, line 345

```
  app.use(morgan('combined', { stream: accessLogStream }))
```

#### Recommendation

Make it a POST with a JSON body. Always require and verify the current password (or a recent re-authentication). Invalidate other sessions after a change. Keep secrets out of URLs, and scrub query strings from access logs.

#### References

- [A07:2025 Authentication Failures](https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/)
- [CWE-620](https://cwe.mitre.org/data/definitions/620.html)
- [ASVS 5.0.0 V6.2 Password Security](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x15-V6-Authentication.md#v62-password-security)
- [ASVS 5.0.0 V6.3 General Authentication Security](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x15-V6-Authentication.md#v63-general-authentication-security)
- [ASVS 5.0.0 V6.4 Authentication Factor Lifecycle and Recovery](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x15-V6-Authentication.md#v64-authentication-factor-lifecycle-and-recovery)
- [ASVS v5.0.0-11.4.2 (V11.4 Hashing and Hash-based Functions)](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x20-V11-Cryptography.md#v114-hashing-and-hash-based-functions)
- [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [NIST SP 800-63B-4 (Digital Identity Guidelines: Authentication)](https://pages.nist.gov/800-63-4/sp800-63b.html)

### F-027: Password reset relies on guessable security question with spoofable throttle

**Severity:** high · **Checklist item:** SEC-01 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** M (up to 2 days) · **Fix before sign-off:** yes

To reset someone's password you only need their email and the answer to a personal question like "your pet's name". No email is sent and the attempt limit can be dodged, so accounts can be taken over by guessing.

#### Details

`resetPassword` changes the password when `hmac(answer)` matches the stored security answer. No token is emailed to the account owner. `/rest/user/security-question?email=` returns the question for any registered email and `{}` otherwise, which enumerates accounts and tells an attacker what to guess. The only throttle is `rateLimit` with `keyGenerator` returning `headers['X-Forwarded-For'] ?? ip` while `trust proxy` is enabled. A client can send arbitrary X-Forwarded-For values, so each attempt gets a fresh bucket. `/rest/user/login` has no rate limit or lockout at all, and the 2FA verify limiter (100 per 5 minutes per IP) allows brute forcing six-digit TOTP codes over time.

**Likelihood:** Security answers (mother's maiden name, first pet…) are often public or guessable, and the 100-per-5-minutes limit is bypassed by changing the X-Forwarded-For header.
**Impact:** Takeover of any account whose email is known, with no email ownership proof.

#### Evidence

`routes/resetPassword.ts`, lines 34–49

```
    try {
      const data = await SecurityAnswerModel.findOne({
        include: [{
          model: UserModel,
          where: { email }
        }]
      })
      if ((data != null) && security.hmac(answer) === data.answer) {
        const user = await UserModel.findByPk(data.UserId)
        if (user) {
          const updatedUser = await user.update({ password: newPassword })
          res.json({ user: updatedUser })
        }
      } else {
        res.status(401).send(res.__('Wrong answer to security question.'))
      }
```

`routes/securityQuestion.ts`, lines 12–26

```
  return async ({ query }: Request, res: Response, next: NextFunction) => {
    const email = query.email
    try {
      const answer = await SecurityAnswerModel.findOne({
        include: [{
          model: UserModel,
          where: { email: email?.toString() }
        }]
      })
      if (answer != null) {
        const question = await SecurityQuestionModel.findByPk(answer.SecurityQuestionId)
        res.json({ question })
      } else {
        res.json({})
      }
```

`server.ts`, lines 348–353

```
  app.enable('trust proxy')
  app.use('/rest/user/reset-password', rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 100,
    keyGenerator ({ headers, ip }: { headers: any, ip: any }) { return headers['X-Forwarded-For'] ?? ip }
  }))
```

`server.ts`, lines 455–458

```
  app.post('/rest/2fa/verify',
    rateLimit({ windowMs: 5 * 60 * 1000, max: 100, validate: false }),
    utils.asyncHandler(twoFactorAuth.verify)
  )
```

`server.ts`, line 590

```
  app.post('/rest/user/login', login())
```

#### Recommendation

Replace security questions with a single-use, time-limited reset link emailed to the address on file. Rate-limit login, reset, security-question and 2FA verify per account and per real client IP: configure `trust proxy` to the exact number of proxy hops and don't key on a raw header. Return identical responses for unknown emails.

#### References

- [A07:2025 Authentication Failures](https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/)
- [CWE-640](https://cwe.mitre.org/data/definitions/640.html)
- [ASVS 5.0.0 V6.2 Password Security](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x15-V6-Authentication.md#v62-password-security)
- [ASVS 5.0.0 V6.3 General Authentication Security](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x15-V6-Authentication.md#v63-general-authentication-security)
- [ASVS 5.0.0 V6.4 Authentication Factor Lifecycle and Recovery](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x15-V6-Authentication.md#v64-authentication-factor-lifecycle-and-recovery)
- [ASVS v5.0.0-11.4.2 (V11.4 Hashing and Hash-based Functions)](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x20-V11-Cryptography.md#v114-hashing-and-hash-based-functions)
- [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [NIST SP 800-63B-4 (Digital Identity Guidelines: Authentication)](https://pages.nist.gov/800-63-4/sp800-63b.html)

### F-028: Any user can read, modify and check out other users' baskets

**Severity:** high · **Checklist item:** SEC-03 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** M (up to 2 days) · **Fix before sign-off:** yes

Shopping baskets are not tied to their owners on the server. A logged-in customer can change a number in the request to see or alter someone else's basket and even place orders from it.

#### Details

`/rest/basket/:id` only requires a valid JWT. `retrieveBasket`, `placeOrder` and `applyCoupon` look the basket up by `req.params.id` and never compare it to the caller's `bid` or `UserId`. The generated finale endpoints `/api/BasketItems/:id` (GET/PUT/DELETE) only require authentication, with no ownership check. `addBasketItem` checks `basketIds[0]` against `user.bid` but saves `basketIds[basketIds.length - 1]`, so sending `BasketId` twice (HTTP parameter pollution through the custom JSON parser) adds items to any basket.

**Likelihood:** Basket IDs are small sequential integers, so any logged-in user can iterate them.
**Impact:** Other customers' basket contents are exposed, items can be added or removed and coupons applied in their baskets, and their baskets can be checked out with the attacker's wallet or no payment at all.

#### Evidence

`routes/basket.ts`, lines 16–27

```
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id
      const basket = await BasketModel.findOne({ where: { id }, include: [{ model: ProductModel, paranoid: false, as: 'Products' }] })
      /* jshint eqeqeq:false */
      if (((basket?.Products) != null) && basket.Products.length > 0) {
        for (let i = 0; i < basket.Products.length; i++) {
          basket.Products[i].name = req.__(basket.Products[i].name)
        }
      }

      res.json(utils.queryResultToJson(basket))
```

`routes/order.ts`, lines 33–39

```
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id
    BasketModel.findOne({ where: { id }, include: [{ model: ProductModel, paranoid: false, as: 'Products' }] })
      .then(async (basket: BasketModel | null) => {
        if (basket != null) {
          const customer = security.authenticatedUsers.from(req)
          const email = customer ? customer.data ? customer.data.email : '' : ''
```

`routes/coupon.ts`, lines 11–24

```
  return async ({ params }: Request, res: Response, next: NextFunction) => {
    try {
      const id = params.id
      let coupon: string | undefined | null = params.coupon ? decodeURIComponent(params.coupon) : undefined
      const discount = security.discountFromCoupon(coupon)
      coupon = discount ? coupon : null

      const basket = await BasketModel.findByPk(id)
      if (!basket) {
        next(new Error(`Basket with id=${id} does not exist.`))
        return
      }

      await basket.update({ coupon: coupon?.toString() })
```

`routes/basketItems.ts`, lines 21–46

```
    const result = utils.parseJsonCustom((req as RequestWithRawBody).rawBody)
    const productIds = []
    const basketIds = []
    const quantities = []

    for (let i = 0; i < result.length; i++) {
      if (result[i].key === 'ProductId') {
        productIds.push(result[i].value)
      } else if (result[i].key === 'BasketId') {
        basketIds.push(result[i].value)
      } else if (result[i].key === 'quantity') {
        quantities.push(result[i].value)
      }
    }

    const user = security.authenticatedUsers.from(req)
    if (user && basketIds[0] && basketIds[0] !== 'undefined' && Number(user.bid) != Number(basketIds[0])) { // eslint-disable-line eqeqeq
      res.status(401).send('{\'error\' : \'Invalid BasketId\'}')
    } else {
      const basketItem = {
        ProductId: productIds[productIds.length - 1],
        BasketId: basketIds[basketIds.length - 1],
        quantity: quantities[quantities.length - 1]
      }

      const basketItemInstance = BasketItemModel.build(basketItem)
```

`server.ts`, lines 359–362

```
  app.use('/rest/basket', security.isAuthorized(), security.appendUserId())
  /* BasketItems: API only accessible for authenticated users */
  app.use('/api/BasketItems', security.isAuthorized())
  app.use('/api/BasketItems/:id', security.isAuthorized())
```

#### Recommendation

Derive the basket from the authenticated user (`BasketModel.findOne({ where: { id, UserId: user.id } })`) in every basket, checkout and coupon handler. Add finale `before` hooks (or custom routes) that scope BasketItem reads and writes to the caller's basket. Use the standard JSON body parser and reject duplicate keys.

#### References

- [A01:2025 Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
- [CWE-639](https://cwe.mitre.org/data/definitions/639.html)
- [ASVS 5.0.0 V8.2 General Authorization Design](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x17-V8-Authorization.md#v82-general-authorization-design)
- [ASVS 5.0.0 V8.3 Operation Level Authorization](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x17-V8-Authorization.md#v83-operation-level-authorization)
- [ASVS 5.0.0 V14.2 General Data Protection](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x23-V14-Data-Protection.md#v142-general-data-protection)
- [Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [Insecure Direct Object Reference Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)

### F-029: Unvalidated amounts let users mint wallet credit and negative orders

**Severity:** high · **Checklist item:** SEC-09 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** M (up to 2 days) · **Fix before sign-off:** yes

The wallet top-up adds whatever amount the browser asks for without charging anything, and baskets accept negative quantities. Customers can give themselves unlimited store credit and free goods.

#### Details

`addWalletBalance` checks only that `paymentId` is one of the caller's cards, then runs `WalletModel.increment({ balance: req.body.balance })` with an unvalidated number. No payment is taken, and negative or huge values are accepted. `BasketItem.quantity` is a bare INTEGER with no `min` validator, and `quantityCheck` only compares upper limits. In `placeOrder`, `itemTotal = itemPrice * quantity` can be negative. With `paymentId === 'wallet'` the check `wallet.balance >= totalPrice` passes and `decrement` by a negative total increases the balance. `deliveryMethodId` and the coupon campaign data also come straight from the body.

**Likelihood:** Any registered user with a saved card (any number is accepted) can send the request directly.
**Impact:** Free store credit and goods: wallet top-ups are never charged, and negative basket quantities produce negative order totals that credit the wallet.

#### Evidence

`routes/wallet.ts`, lines 21–35

```
export function addWalletBalance () {
  return async (req: Request, res: Response, next: NextFunction) => {
    const cardId = req.body.paymentId
    const card = cardId ? await CardModel.findOne({ where: { id: cardId, UserId: req.body.UserId } }) : null
    if (card != null) {
      try {
        await WalletModel.increment({ balance: req.body.balance }, { where: { UserId: req.body.UserId } })
        res.status(200).json({ status: 'success', data: req.body.balance })
      } catch {
        res.status(404).json({ status: 'error' })
      }
    } else {
      res.status(402).json({ status: 'error', message: 'Payment not accepted.' })
    }
  }
```

`models/basketitem.ts`, line 39

```
      quantity: DataTypes.INTEGER
```

`routes/order.ts`, line 92

```
              const itemTotal = itemPrice * BasketItem.quantity
```

`routes/order.ts`, lines 144–155

```
          if (req.body.UserId) {
            if (req.body.orderDetails && req.body.orderDetails.paymentId === 'wallet') {
              const wallet = await WalletModel.findOne({ where: { UserId: req.body.UserId } })
              if ((wallet != null) && wallet.balance >= totalPrice) {
                await WalletModel.decrement({ balance: totalPrice }, { where: { UserId: req.body.UserId } })
              } else {
                next(new Error('Insufficient wallet balance.'))
                return
              }
            }
            try {
              await WalletModel.increment({ balance: totalPoints }, { where: { UserId: req.body.UserId } })
```

#### Recommendation

Validate request bodies with a schema (zod/joi): positive integer quantities (also as a model `validate: { min: 1 }`), and positive, bounded top-up amounts. Credit the wallet only after a confirmed payment-provider charge. Reject orders whose computed total is ≤ 0.

#### References

- [A05:2025 Injection](https://owasp.org/Top10/2025/A05_2025-Injection/)
- [CWE-20](https://cwe.mitre.org/data/definitions/20.html)
- [ASVS 5.0.0 V2.2 Input Validation](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x11-V2-Validation-and-Business-Logic.md#v22-input-validation)
- [ASVS v5.0.0-15.3.3 (V15.3 Defensive Coding)](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x24-V15-Secure-Coding-and-Architecture.md#v153-defensive-coding)
- [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Mass Assignment Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html)

### F-032: B2B order lines evaluated as code in node:vm with notevil

**Severity:** high · **Checklist item:** SEC-04 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

The business-order endpoint treats part of the order as a program and runs it. Attackers can use this to freeze the shop or potentially take over the server.

#### Details

`b2bOrder` places `body.orderLinesData` into a `vm` context and runs `safeEval(orderLinesData)`. Node's documentation states `vm` is not a security mechanism. `notevil` 1.3.x is abandoned and has published sandbox escapes. The 2-second timeout is synchronous, so each request stalls every other user.

**Likelihood:** Any authenticated user (accounts are free; JWTs are forgeable per F-023) can post `orderLinesData`.
**Impact:** An infinite loop blocks the event loop for 2 s per request, which is easy denial of service, and `node:vm` plus the unmaintained `notevil` is a known escape surface leading to code execution.

#### Evidence

`routes/b2bOrder.ts`, lines 17–32

```
  return ({ body }: Request, res: Response, next: NextFunction) => {
    if (utils.isChallengeEnabled(challenges.ch143cb02f) || utils.isChallengeEnabled(challenges.ch0ca8dfb9)) {
      const orderLinesData = body.orderLinesData || ''
      try {
        const sandbox = { safeEval, orderLinesData }
        vm.createContext(sandbox)
        vm.runInContext('safeEval(orderLinesData)', sandbox, { timeout: 2000 })
        res.json({ cid: body.cid, orderNo: uniqueOrderNumber(), paymentDue: dateTwoWeeksFromNow() })
      } catch (err) {
        if (utils.getErrorMessage(err).match(/Script execution timed out.*/) != null) {
          res.status(503)
          next(new Error('Sorry, we are temporarily not available! Please try again later.'))
        } else {
          next(err)
        }
      }
```

#### Recommendation

Parse order lines as JSON and validate them with a schema. Remove `vm`/`notevil` completely.

#### References

- [A05:2025 Injection](https://owasp.org/Top10/2025/A05_2025-Injection/)
- [CWE-94](https://cwe.mitre.org/data/definitions/94.html)
- [ASVS 5.0.0 V1.2 Injection Prevention](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x10-V1-Encoding-and-Sanitization.md#v12-injection-prevention)
- [Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
- [SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)
- [NodeJS Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

### F-033: Order tracking builds a MarsDB $where JavaScript expression from the URL

**Severity:** high · **Checklist item:** SEC-04 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

The order tracking page passes the order number straight into a piece of code the database runs. Anyone, without logging in, can list every customer's orders or stall the server.

#### Details

`trackOrder` runs `ordersCollection.find({ $where: \`this.orderId === '${id}'\\` })`. When the related challenge flag is enabled, `id` is only truncated to 60 characters, not sanitised. `$where` is evaluated as JavaScript by MarsDB. A payload such as `x' || true || '` returns every order (emails are only vowel-masked, plus products and totals).

**Likelihood:** Unauthenticated: anyone can call /rest/track-order/:id. The truncation still leaves 60 characters of injected JS.
**Impact:** The injected expression runs server-side for every order, enough to dump all orders (`' || true || '`) or hang the process with a loop.

#### Evidence

`routes/trackOrder.ts`, lines 13–22

```
  return (req: Request, res: Response) => {
    // Truncate id to avoid unintentional RCE
    const id = !utils.isChallengeEnabled(challenges.ch46bea641) ? String(req.params.id).replace(/[^\w-]+/g, '') : utils.trunc(req.params.id, 60)

    db.ordersCollection.find({ $where: `this.orderId === '${id}'` }).then((order: any) => {
      const result = utils.queryResultToJson(order)
      if (result.data[0] === undefined) {
        result.data[0] = { orderId: id }
      }
      res.json(result)
```

#### Recommendation

Use an equality filter `find({ orderId: String(req.params.id) })` and drop `$where`. Return orders only to their owner.

#### References

- [CWE-943](https://cwe.mitre.org/data/definitions/943.html)
- [ASVS 5.0.0 V1.2 Injection Prevention](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x10-V1-Encoding-and-Sanitization.md#v12-injection-prevention)
- [Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
- [SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)
- [NodeJS Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

### F-034: Review endpoints: $where injection, operator injection and unowned edits

**Severity:** high · **Checklist item:** SEC-04 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

Product reviews are poorly protected. Anyone can freeze the server through the review page, any logged-in user can rewrite every review in the shop at once, and reviews can be posted pretending to be another customer.

#### Details

`showProductReviews` builds `$where: 'this.product == ' + id`. With the challenge flag on, `id` is the URL segment truncated to 40 characters, and the code installs a global blocking `sleep()` reachable from it. `updateProductReviews` passes `req.body.id` straight into the `_id` filter with `multi: true`, so an object like `{"$ne": -1}` matches every review. It also never checks that the caller authored the review (`user` is fetched and ignored). `createProductReviews` (PUT, no auth middleware) takes `author` from the body instead of the session. `likeProductReviews` has a read-modify-write race (the 150 ms sleep makes it wide), so a user can like the same review many times.

**Likelihood:** Show is unauthenticated; edit needs any account. Payloads such as `{"id":{"$ne":-1}}` are trivial.
**Impact:** One request overwrites every product review in the shop. The read endpoint also allows a blocking `sleep()` DoS, and reviews can be posted under anyone's name.

#### Evidence

`routes/showProductReviews.ts`, lines 17–36

```
global.sleep = (time: number) => {
  // Ensure that users don't accidentally dos their servers for too long
  if (time > 2000) {
    time = 2000
  }
  const stop = new Date().getTime()
  while (new Date().getTime() < stop + time) {
    ;
  }
}

export function showProductReviews () {
  return (req: Request, res: Response, next: NextFunction) => {
    // Truncate id to avoid unintentional RCE
    const id = !utils.isChallengeEnabled(challenges.ch56e73652) ? Number(req.params.id) : utils.trunc(req.params.id, 40)

    // Measure how long the query takes, to check if there was a nosql dos attack
    const t0 = new Date().getTime()

    db.reviewsCollection.find({ $where: 'this.product == ' + id }).then((reviews: Review[]) => {
```

`routes/updateProductReviews.ts`, lines 15–20

```
    const user = security.authenticatedUsers.from(req)
    db.reviewsCollection.update(
      { _id: req.body.id },
      { $set: { message: req.body.message } },
      { multi: true }
    ).then(
```

`routes/createProductReviews.ts`, lines 16–25

```
    const user = security.authenticatedUsers.from(req)

    try {
      await reviewsCollection.insert({
        product: req.params.id,
        message: req.body.message,
        author: req.body.author,
        likesCount: 0,
        likedBy: []
      })
```

`routes/likeProductReviews.ts`, lines 30–52

```
      const likedBy = review.likedBy
      if (likedBy.includes(user.data.email)) {
        return res.status(403).json({ error: 'Not allowed' })
      }

      await db.reviewsCollection.update(
        { _id: id },
        { $inc: { likesCount: 1 } }
      )

      // Artificial wait for timing attack challenge
      await sleep(150)
      try {
        const updatedReview: Review = await db.reviewsCollection.findOne({ _id: id })
        const updatedLikedBy = updatedReview.likedBy
        updatedLikedBy.push(user.data.email)

        const count = updatedLikedBy.filter(email => email === user.data.email).length

        const result = await db.reviewsCollection.update(
          { _id: id },
          { $set: { likedBy: updatedLikedBy } }
        )
```

#### Recommendation

Use `find({ product: Number(id) })`. Coerce `_id` to a string and reject objects. Filter updates with `{ _id, author: user.data.email }` and drop `multi`. Require auth on create and take the author from the session. Make likes atomic (`$addToSet` plus conditional `$inc`). Remove the global `sleep`.

#### References

- [CWE-943](https://cwe.mitre.org/data/definitions/943.html)
- [ASVS 5.0.0 V1.2 Injection Prevention](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x10-V1-Encoding-and-Sanitization.md#v12-injection-prevention)
- [Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
- [SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)
- [NodeJS Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

### F-037: Profile image URL is fetched server-side without any allowlist

**Severity:** high · **Checklist item:** SEC-07 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** M (up to 2 days) · **Fix before sign-off:** yes

The "profile picture from a link" feature makes the server download whatever address a user gives it, including internal systems that should never be reachable from outside. The result can then be read back as an image.

#### Details

`profileImageUrlUpload` calls `fetch(url)` with `req.body.imageUrl` unchecked (scheme, host, IP range), follows redirects, and writes the body to `frontend/dist/.../uploads/<id>.<ext>`, where it is publicly readable. Full-read SSRF. On failure the raw URL is stored as `profileImage`, which is later interpolated into the profile page's Content-Security-Policy (see the CSP finding).

**Likelihood:** Any logged-in user can submit any URL; redirects are followed by default.
**Impact:** The server makes requests to internal services and cloud metadata endpoints (e.g. 169.254.169.254) on the attacker's behalf, and the response body is saved as a publicly served image.

#### Evidence

`routes/profileImageUrlUpload.ts`, lines 18–37

```
    if (req.body.imageUrl !== undefined) {
      const url = req.body.imageUrl
      if (url.match(/(.)*solve\/challenges\/server-side(.)*/) !== null) req.app.locals.abused_ssrf_bug = true
      const loggedInUser = security.authenticatedUsers.get(req.cookies.token)
      if (loggedInUser) {
        try {
          const response = await fetch(url)
          if (!response.ok || !response.body) {
            throw new Error('url returned a non-OK status code or an empty body')
          }
          const ext = ['jpg', 'jpeg', 'png', 'svg', 'gif'].includes(url.split('.').slice(-1)[0].toLowerCase()) ? url.split('.').slice(-1)[0].toLowerCase() : 'jpg'
          const fileStream = fs.createWriteStream(`frontend/dist/frontend/assets/public/images/uploads/${loggedInUser.data.id}.${ext}`, { flags: 'w' })
          await finished(Readable.fromWeb(response.body as any).pipe(fileStream))
          const user = await UserModel.findByPk(loggedInUser.data.id)
          await user?.update({ profileImage: `/assets/public/images/uploads/${loggedInUser.data.id}.${ext}` })
        } catch (error) {
          try {
            const user = await UserModel.findByPk(loggedInUser.data.id)
            await user?.update({ profileImage: url })
            logger.warn(`Error retrieving user profile image: ${utils.getErrorMessage(error)}; using image link directly`)
```

#### Recommendation

Accept only https URLs. Resolve DNS and reject private, loopback, link-local and metadata ranges, and re-check on each redirect (or set `redirect: 'manual'`). Verify the content type is an image and cap the size. Preferably fetch through an egress proxy with an allowlist.

#### References

- [A01:2025 Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
- [CWE-918](https://cwe.mitre.org/data/definitions/918.html)
- [ASVS v5.0.0-1.3.6 (V1.3 Sanitization)](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x10-V1-Encoding-and-Sanitization.md#v13-sanitization)
- [Server-Side Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)

### F-042: Angular sanitizer bypassed on search term, feedback, emails, IPs and orders

**Severity:** high · **Checklist item:** SEC-05 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** M (up to 2 days) · **Fix before sign-off:** yes

Several pages deliberately switch off the browser-side protection against malicious scripts. A crafted link, or a crafted review, email address or IP header, can run attacker code in other users' and admins' browsers and steal their logins.

#### Details

`bypassSecurityTrustHtml` is applied to: the `q` query parameter (search-result 140, reflected); product descriptions (search-result 110), which are writable unauthenticated via PUT /api/Products (F-039); feedback comments on the About carousel and the admin page; user emails on the admin page (built into an HTML string with interpolation); `lastLoginIp` taken from the attacker-controlled `True-Client-IP` header (saveLoginIp stores it unsanitised when the challenge flag is on); and track-order IDs. Product details render `description` via `[innerHTML]`. Server-side, models rely on `sanitize-html` 1.4.2 (2014, with known bypasses), and the feedback model uses the single-pass `sanitizeHtml` variant, which nested payloads defeat.

**Likelihood:** The search sink is a reflected DOM XSS via a link (`/#/search?q=<iframe src="javascript:...">`). The others are stored XSS fed by unauthenticated or self-service inputs.
**Impact:** Script runs in victims' sessions, including admins. Tokens sit in localStorage and non-HttpOnly cookies, so this means account takeover.

#### Evidence

`frontend/src/app/search-result/search-result.component.ts`, lines 108–140

```
  trustProductDescription (tableData: any[]) {
    for (let i = 0; i < tableData.length; i++) {
      tableData[i].description = this.sanitizer.bypassSecurityTrustHtml(tableData[i].description)
    }
  }


  ngOnDestroy () {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe()
    }

    if (this.dataSource) {
      this.dataSource.disconnect()
    }

    if (this.gridDataSourceSubscription) {
      this.gridDataSourceSubscription.unsubscribe()
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
  }

  filterTable () {
    let queryParam: string = this.route.snapshot.queryParams.q
    if (queryParam) {
      queryParam = queryParam.trim()
      this.ngZone.runOutsideAngular(() => {
```

`frontend/src/app/administration/administration.component.ts`, lines 73–92

```
        for (const user of this.userDataSource) {
          user.email = this.sanitizer.bypassSecurityTrustHtml(`<span class="${this.doesUserHaveAnActiveSession(user) ? 'confirmation' : 'error'}">${user.email}</span>`)
        }
        this.userDataSource = new MatTableDataSource(this.userDataSource)
        this.userDataSource.paginator = this.paginatorUsers
        this.resultsLengthUser = users.length
      },
      error: (err) => {
        this.error = err
        console.log(this.error)
      }
    })
  }

  findAllFeedbacks () {
    this.feedbackService.find().subscribe({
      next: (feedbacks) => {
        this.feedbackDataSource = feedbacks
        for (const feedback of this.feedbackDataSource) {
          feedback.comment = this.sanitizer.bypassSecurityTrustHtml(feedback.comment)
```

`frontend/src/app/about/about.component.ts`, lines 117–122

```
          feedbacks[i].comment = `<figcaption><p class="feedback-comment">${
            feedbacks[i].comment
          }</p><div class="feedback-stars">(${this.stars[feedbacks[i].rating]})</div></figcaption>`
          feedbacks[i].comment = this.sanitizer.bypassSecurityTrustHtml(
            feedbacks[i].comment
          )
```

`frontend/src/app/last-login-ip/last-login-ip.component.ts`, lines 38–40

```
      if (payload.data.lastLoginIp) {

        this.lastLoginIp = this.sanitizer.bypassSecurityTrustHtml(`<small>${payload.data.lastLoginIp}</small>`)
```

`routes/saveLoginIp.ts`, lines 18–31

```
      let lastLoginIp = req.headers['true-client-ip']
      if (Array.isArray(lastLoginIp)) {
        lastLoginIp = lastLoginIp[0]
      }
      if (utils.isChallengeEnabled(challenges.ch29ff72e7)) {
      } else {
        lastLoginIp = security.sanitizeSecure(lastLoginIp ?? '')
      }
      if (lastLoginIp === undefined) {
        lastLoginIp = utils.toSimpleIpAddress(req.socket.remoteAddress ?? '')
      }
      try {
        const user = await UserModel.findByPk(loggedInUser.data.id)
        const updatedUser = await user?.update({ lastLoginIp: lastLoginIp?.toString() })
```

#### Recommendation

Remove every `bypassSecurityTrustHtml` on data. Use text interpolation (`{{ }}`) and CSS classes instead of building HTML strings. Where rich text is needed, sanitise with a current DOMPurify on output. Upgrade sanitize-html. Ignore `True-Client-IP` unless set by a trusted proxy. Add a strict CSP (see SEC-11).

#### References

- [A05:2025 Injection](https://owasp.org/Top10/2025/A05_2025-Injection/)
- [CWE-79](https://cwe.mitre.org/data/definitions/79.html)
- [ASVS 5.0.0 V1.1 Encoding and Sanitization Architecture](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x10-V1-Encoding-and-Sanitization.md#v11-encoding-and-sanitization-architecture)
- [ASVS 5.0.0 V1.3 Sanitization](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x10-V1-Encoding-and-Sanitization.md#v13-sanitization)
- [ASVS 5.0.0 V3.2 Unintended Content Interpretation](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x12-V3-Web-Frontend-Security.md#v32-unintended-content-interpretation)
- [Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOM based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)

### F-043: Data-erasure form spreads request body into render options, allowing file read

**Severity:** high · **Checklist item:** SEC-08 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

The "delete my data" page lets a logged-in user name any file on the server and see the beginning of it. That can expose configuration and stored secrets.

#### Details

`res.render('dataErasureResult', { ...req.body, ...themeVars })` passes user input as hbs render options. hbs honours the `layout` option as a file path, and the only check is a substring deny-list of `ftp`, `ctf.key` and `encryptionkeys` after `path.resolve`. The handler is cookie-authenticated with no CSRF token, so a cross-site form can also file deletion requests for a victim.

**Likelihood:** Any logged-in user can POST `layout=../../../etc/passwd` (or any path) to /dataerasure.
**Impact:** The first 100 characters of arbitrary server files are disclosed. The deny-list covers only three substrings, so config, the SQLite DB, logs and .env files remain readable.

#### Evidence

`routes/dataErasure.ts`, lines 103–117

```
      if (req.body.layout && utils.isChallengeEnabled(challenges.ch4086891b)) {
        const filePath: string = path.resolve(req.body.layout).toLowerCase()
        const isForbiddenFile: boolean = (filePath.includes('ftp') || filePath.includes('ctf.key') || filePath.includes('encryptionkeys'))
        if (!isForbiddenFile) {
          res.render('dataErasureResult', {
            ...req.body,
            ...themeVars
          }, (error, html) => {
            if (!html || error) {
              next(new Error(error.message))
            } else {
              const sendlfrResponse: string = html.slice(0, 100) + '......'
              res.send(sendlfrResponse)
            }
          })
```

#### Recommendation

Never spread `req.body` into template locals or options. Pass only the explicit fields needed (`email`, `securityAnswer`) and fix the layout server-side. Add CSRF protection to this cookie-authenticated POST.

#### References

- [A06:2025 Insecure Design](https://owasp.org/Top10/2025/A06_2025-Insecure_Design/)
- [CWE-73](https://cwe.mitre.org/data/definitions/73.html)
- [ASVS 5.0.0 V5.2 File Upload and Content](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x14-V5-File-Handling.md#v52-file-upload-and-content)
- [ASVS 5.0.0 V5.3 File Storage](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x14-V5-File-Handling.md#v53-file-storage)
- [ASVS 5.0.0 V5.4 File Download](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x14-V5-File-Handling.md#v54-file-download)
- [File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)

### F-046: Discount coupons are unsigned encodings anyone can forge

**Severity:** high · **Checklist item:** SEC-14 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** M (up to 2 days) · **Fix before sign-off:** yes

Discount codes are just a reversible scrambling of the month and the percentage, with no secret involved. Anyone who works this out can make their own 99%-off code.

#### Details

`generateCoupon` returns `z85.encode(toMMMYY(date) + '-' + discount)`, and `discountFromCoupon` decodes it and accepts any two-digit discount whose month matches the current one. There is no MAC, server-side coupon table or single-use tracking. Relatedly, security answers are HMACed with a hard-coded key in source (`'pa4qacea4VK9t9nGv7yZtwmj'`), so a DB leak plus the repo allows offline guessing, and order IDs embed `md5(email).slice(0,4)`.

**Likelihood:** The format (z85 of "MMMYY-NN") is visible from any one real coupon and from the client code; no account knowledge is needed.
**Impact:** Customers can apply any discount up to 99% on any order during the current month, which is direct revenue loss.

#### Evidence

`lib/insecurity.ts`, lines 97–119

```
export const generateCoupon = (discount: number, date = new Date()) => {
  const coupon = utils.toMMMYY(date) + '-' + discount
  return z85.encode(coupon)
}

export const discountFromCoupon = (coupon?: string) => {
  if (!coupon) {
    return undefined
  }
  const decoded = z85.decode(coupon)
  if (decoded && (hasValidFormat(decoded.toString()) != null)) {
    const parts = decoded.toString().split('-')
    const validity = parts[0]
    if (utils.toMMMYY(new Date()) === validity) {
      const discount = parts[1]
      return parseInt(discount)
    }
  }
}

function hasValidFormat (coupon: string) {
  return coupon.match(/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[0-9]{2}-[0-9]{2}/)
}
```

`lib/insecurity.ts`, line 42

```
export const hmac = (data: string) => crypto.createHmac('sha256', 'pa4qacea4VK9t9nGv7yZtwmj').update(data).digest('hex')
```

#### Recommendation

Store issued coupons server-side (code, discount, expiry, redemption count) and look them up, or sign them with an HMAC key from a secret store and verify with `timingSafeEqual`. Move the security-answer HMAC key to an environment secret, or better, retire security questions (see F-027).

#### References

- [A08:2025 Software or Data Integrity Failures](https://owasp.org/Top10/2025/A08_2025-Software_or_Data_Integrity_Failures/)
- [CWE-345](https://cwe.mitre.org/data/definitions/345.html)
- [ASVS 5.0.0 V11.3 Encryption Algorithms](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x20-V11-Cryptography.md#v113-encryption-algorithms)
- [ASVS 5.0.0 V11.4 Hashing and Hash-based Functions](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x20-V11-Cryptography.md#v114-hashing-and-hash-based-functions)
- [ASVS 5.0.0 V11.5 Random Values](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x20-V11-Cryptography.md#v115-random-values)
- [Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

### F-048: Customer order PDFs written to the public /ftp folder; extension check bypassable

**Severity:** high · **Checklist item:** SEC-08 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

Each order confirmation, with the customer's email and what they bought, is saved into a public download folder that anyone can browse. Confidential backup files in that folder can be downloaded with a simple trick.

#### Details

This goes beyond scanner leads F-018 (directory listing on /ftp) and F-009 (sendFile path traversal). `placeOrder` writes `order_<id>.pdf` containing the customer email and line items into `ftp/`, which `serveIndex('ftp')` lists and `servePublicFiles` serves. In `servePublicFiles`, the `.md`/`.pdf` allow-list runs before `cutOffPoisonNullByte`, so `/ftp/package.json.bak%2500.md` passes the check and then serves `package.json.bak`. The folder also ships `incident-support.kdbx`, explicitly allow-listed.

**Likelihood:** /ftp is browsable without login, so anyone can list and download every order confirmation.
**Impact:** Every customer's email, purchased items, prices and order ID are exposed. Backup files (package.json.bak, coupons\_2013.md.bak, the KeePass database) are downloadable via `%2500`.

#### Evidence

`routes/order.ts`, lines 40–45

```
          const orderId = security.hash(email).slice(0, 4) + '-' + utils.randomHexString(16)
          const pdfFile = `order_${orderId}.pdf`
          const { default: PDFDocument } = await import('pdfkit')
          const doc = new PDFDocument()
          const date = new Date().toJSON().slice(0, 10)
          const fileWriter = doc.pipe(fs.createWriteStream(path.join('ftp/', pdfFile)))
```

`routes/fileServer.ts`, lines 25–44

```
  function verify (file: string, res: Response, next: NextFunction) {
    if (file && (endsWithAllowlistedFileType(file) || (file === 'incident-support.kdbx'))) {
      file = security.cutOffPoisonNullByte(file)

      verifySuccessfulPoisonNullByteExploit(file)

      res.sendFile(path.resolve('ftp/', file))
    } else {
      res.status(403)
      next(new Error('Only .md and .pdf files are allowed!'))
    }
  }

  function verifySuccessfulPoisonNullByteExploit (file: string) {

  }

  function endsWithAllowlistedFileType (param: string) {
    return param.endsWith('.md') || param.endsWith('.pdf')
  }
```

`server.ts`, lines 278–279

```
  app.use('/ftp', serveIndexMiddleware, serveIndex('ftp', { icons: true }))
  app.use('/ftp(?!/quarantine)/:file', servePublicFiles())
```

#### Recommendation

Store order PDFs outside any served directory and stream them only to the owning user after an auth check. Remove the /ftp listing and static serving. Strip or reject `%00` before validation and validate the final resolved path. Delete backup and credential files from the repository.

#### References

- [A01:2025 Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
- [CWE-552](https://cwe.mitre.org/data/definitions/552.html)
- [ASVS 5.0.0 V5.2 File Upload and Content](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x14-V5-File-Handling.md#v52-file-upload-and-content)
- [ASVS 5.0.0 V5.3 File Storage](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x14-V5-File-Handling.md#v53-file-storage)
- [ASVS 5.0.0 V5.4 File Download](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x14-V5-File-Handling.md#v54-file-download)
- [File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)

### F-051: Ethereum wallet recovery phrase hard-coded in server source

**Severity:** high · **Checklist item:** SEC-10 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

The 12-word recovery phrase for a crypto wallet is written in the code. Anyone who reads the code can take everything in that wallet.

#### Details

`checkKeys` derives a wallet from the literal 12-word BIP-39 mnemonic in source in order to compare a submitted private key. Gitleaks did not flag it (not among F-001..F-008). A mnemonic yields every private key of the wallet, and endpoint responses also confirm when a submitted key matches.

**Likelihood:** The phrase is in the public repository; anyone can import it into a wallet.
**Impact:** Whoever has the repository fully controls that wallet and any funds or NFTs held by its derived addresses.

#### Evidence

`routes/checkKeys.ts`, lines 9–16

```
      const { HDNodeWallet } = await import('ethers')
      const mnemonic = 'purpose betray marriage blame crunch monitor spin slide donate sport lift clutch'
      const mnemonicWallet = HDNodeWallet.fromPhrase(mnemonic)
      const privateKey = mnemonicWallet.privateKey
      const publicKey = mnemonicWallet.publicKey
      const address = mnemonicWallet.address
      if (req.body.privateKey === privateKey) {
        res.status(200).json({ success: true, message: 'Challenge successfully solved', status: challenges.che9198e01 })
```

#### Recommendation

Treat the wallet as compromised: move any assets out and stop using it. Don't keep mnemonics in code. If a comparison is needed, store only the expected public address and verify a signature instead.

#### References

- [A07:2025 Authentication Failures](https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/)
- [CWE-798](https://cwe.mitre.org/data/definitions/798.html)
- [ASVS 5.0.0 V13.3 Secret Management](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x22-V13-Configuration.md#v133-secret-management)
- [Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

### F-052: whoami supports JSONP with cookie auth and arbitrary fields, leaking secrets cross-site

**Severity:** high · **Checklist item:** SEC-06 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** yes

A malicious website can quietly ask the shop "who is logged in here?" on a visitor's behalf and receive that visitor's private account details, including their scrambled password and two-factor secret.

#### Details

`retrieveLoggedInUser` authenticates via `req.cookies.token`, which browsers attach to cross-site script loads since no SameSite is set. It honours `?callback=`, responding with `res.jsonp`, which is designed to be readable cross-origin. The `fields` parameter copies any property of the cached user object into the response, including `password` and `totpSecret`. So `<script src="https://shop/rest/user/whoami?callback=steal&fields=email,password,totpSecret">` exfiltrates them.

**Likelihood:** Any website a logged-in shopper visits can include a script tag pointing at this endpoint.
**Impact:** The attacker's page receives the victim's email, MD5 password hash, TOTP secret and deluxe token, enough to crack the password and clone the second factor.

#### Evidence

`routes/currentUser.ts`, lines 17–33

```
      if (security.verify(req.cookies.token)) {
        user = security.authenticatedUsers.get(req.cookies.token)

        // Parse the fields parameter into an array, splitting by comma.
        // If not provided, both these variables will be undefined.
        const fieldsParam = req.query?.fields as string | undefined
        const requestedFields = fieldsParam ? fieldsParam.split(',').map(f => f.trim()) : []

        let baseUser: any = {}

        if (requestedFields.length > 0) {
          // When fields are specified, return only those fields
          for (const field of requestedFields) {
            if (user?.data[field as keyof typeof user.data] !== undefined) {
              baseUser[field] = user?.data[field as keyof typeof user.data]
            }
          }
```

`routes/currentUser.ts`, lines 53–57

```
    if (req.query.callback === undefined) {
      res.json(response)
    } else {
      res.jsonp(response)
    }
```

#### Recommendation

Remove JSONP support. Restrict `fields` to an allow-list of non-sensitive attributes (id, email, profileImage). Never keep password or TOTP data in the session cache. Set SameSite on the auth cookie.

#### References

- [A01:2025 Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
- [CWE-359](https://cwe.mitre.org/data/definitions/359.html)
- [ASVS 5.0.0 V3.5 Browser Origin Separation](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x12-V3-Web-Frontend-Security.md#v35-browser-origin-separation)
- [ASVS 5.0.0 V3.4 Browser Security Mechanism Headers](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x12-V3-Web-Frontend-Security.md#v34-browser-security-mechanism-headers)
- [Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

### F-056: Untrusted history, usernames and reviews reach the prompt unseparated

**Severity:** high · **Checklist item:** LLM-01 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** M (up to 2 days) · **Fix before sign-off:** yes

The chatbot cannot tell the shop's own instructions apart from text written by visitors. A visitor can plant instructions in a product review or their username, or slip fake turns into the conversation, and the chatbot may obey them, including when it talks to other customers.

#### Details

Three untrusted channels reach the model with nothing separating them from instructions. (1) `messages` is taken straight from `req.body` (routes/chat.ts:187, 202). The client can send any roles, including `system` or fabricated `assistant` and tool turns, and the server never rebuilds the history it actually produced. (2) The username from the (unverified) token is placed inside the system prompt (line 82), and usernames are user-editable, so instructions planted there carry system-level authority. (3) `getProductReviews` returns full review documents (line 148). Reviews are written via PUT /rest/products/:id/reviews with no authentication and arbitrary `message`/`author` (createProductReviews.ts:19-25), so any visitor can plant indirect prompt injection that runs inside other customers' chats, where the tools act as those customers (order lookup, coupon creation, F-053). The defences are rules in the prompt only (lines 87-104). Root causes for the tools themselves are filed separately (F-053, F-054).

**Likelihood:** Likely: product reviews can be written without signing in, users choose their own usernames, and the client sends the whole conversation.
**Impact:** Attackers can override the bot's rules for everyone. Planted reviews can steer other customers' chats, for example toward phishing text or tool calls made with the victim's identity.

#### Evidence

`routes/chat.ts`, lines 81–85

```
export function buildSystemPrompt (userName?: string) {
  const userIdentifier = userName ? `\nThe customer you are currently chatting with is ${userName}.` : ''
  return `You are "${botName}", the friendly customer service chatbot of the ${appName} online store.
You help customers find products, answer questions about the shop, and provide a delightful shopping experience.
Keep your responses concise and helpful.${userIdentifier}
```

`routes/chat.ts`, lines 141–150

```
      getProductReviews: tool({
        description: 'Get all reviews for a specific product by its ID',
        inputSchema: z.object({
          id: z.string().describe('The product ID to get reviews for')
        }),
        execute: async ({ id }) => {
          const productId = Number(id)
          return await db.reviewsCollection.find({ $where: 'this.product == ' + productId }) as Review[]
        }
      }),
```

`routes/chat.ts`, lines 186–203

```
    const model = config.get<string>('application.chatBot.model')
    const messages = req.body?.messages ?? []
    const userName = await getUserNameFromToken(req)

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Content-Encoding', 'identity')
    res.flushHeaders()

    const systemPrompt = buildSystemPrompt(userName)

    try {
      const result = streamText({
        model: provider(model),
        system: systemPrompt,
        messages,
        tools: { ...chatTools },
```

`routes/createProductReviews.ts`, lines 14–25

```
export function createProductReviews () {
  return async (req: Request, res: Response) => {
    const user = security.authenticatedUsers.from(req)

    try {
      await reviewsCollection.insert({
        product: req.params.id,
        message: req.body.message,
        author: req.body.author,
        likesCount: 0,
        likedBy: []
      })
```

#### Recommendation

Keep conversation history on the server (keyed by conversation id) or at least validate that only `user`/`assistant` text roles are present, and drop client-supplied tool or system messages. Take the username out of the system prompt, or pass it as quoted data with strict character limits. Return only the needed review fields, wrapped as clearly delimited data, and require authentication to post reviews. Enforce every policy in tool code rather than the prompt, and keep sensitive tools out of conversations that have pulled in third-party content.

#### References

- [CWE-1427](https://cwe.mitre.org/data/definitions/1427.html)
- [LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)

### F-014: The application redirects to a URL specified by user-supplied input `query` that is not validated.

**Severity:** medium · **Checklist item:** SEC-15 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** no

The application redirects to a URL specified by user-supplied input `query` that is not validated. This could redirect users to malicious locations. Consider using an allow-list approach to validate URLs, or warn users they are being redirected to a third-party website.

#### Details

Semgrep rule rules.javascript.express.security.audit.express-open-redirect.express-open-redirect.

#### Evidence

`routes/redirect.ts`, line 16

```
      res.redirect(toUrl)
```

#### Recommendation

Confirm the input is attacker-controlled; if so, follow the rule's references.

#### References

- [A01:2025 Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
- [CWE-601](https://cwe.mitre.org/data/definitions/601.html)
- [ASVS 5.0.0 V15.3 Defensive Coding](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x24-V15-Secure-Coding-and-Architecture.md#v153-defensive-coding)
- [ASVS 5.0.0 V1.5 Safe Deserialization](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x10-V1-Encoding-and-Sanitization.md#v15-safe-deserialization)
- [NodeJS Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html)
- [Prototype Pollution Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html)

### F-030: Deluxe membership granted without payment for unknown paymentMode

**Severity:** medium · **Checklist item:** SEC-09 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** no

The paid "deluxe" upgrade can be had for free by sending a payment type the server doesn't recognise. The server then skips payment and upgrades the account anyway.

#### Details

`upgradeToDeluxe` charges the wallet only when `paymentMode === 'wallet'` and validates a card only when `paymentMode === 'card'`. Any other value, or none at all, falls through to `user.update({ role: deluxe, ... })`. The card path also never charges the card.

**Likelihood:** Any logged-in customer can post `{"paymentMode":"x"}` directly to the API.
**Impact:** Paid membership, with its discounted prices, free delivery and lifted purchase limits, is obtained for free.

#### Evidence

`routes/deluxe.ts`, lines 24–47

```
      if (req.body.paymentMode === 'wallet') {
        const wallet = await WalletModel.findOne({ where: { UserId: req.body.UserId } })
        if ((wallet != null) && wallet.balance < 49) {
          res.status(400).json({ status: 'error', error: 'Insuffienct funds in Wallet' })
          return
        } else {
          await WalletModel.decrement({ balance: 49 }, { where: { UserId: req.body.UserId } })
        }
      }

      if (req.body.paymentMode === 'card') {
        const card = await CardModel.findOne({ where: { id: req.body.paymentId, UserId: req.body.UserId } })
        if ((card == null) || card.expYear < new Date().getFullYear() || (card.expYear === new Date().getFullYear() && card.expMonth - 1 < new Date().getMonth())) {
          res.status(400).json({ status: 'error', error: 'Invalid Card' })
          return
        }
      }

      try {
        const updatedUser = await user.update({ role: security.roles.deluxe, deluxeToken: security.deluxeToken(user.email) })
        const userWithStatus = utils.queryResultToJson(updatedUser)
        const updatedToken = security.authorize(userWithStatus)
        security.authenticatedUsers.put(updatedToken, userWithStatus)
        res.status(200).json({ status: 'success', data: { confirmation: 'Congratulations! You are now a deluxe member!', token: updatedToken } })
```

#### Recommendation

Allow-list `paymentMode`, reject anything else with 400, and grant the role only after a successful charge.

#### References

- [CWE-840](https://cwe.mitre.org/data/definitions/840.html)
- [ASVS 5.0.0 V2.2 Input Validation](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x11-V2-Validation-and-Business-Logic.md#v22-input-validation)
- [ASVS v5.0.0-15.3.3 (V15.3 Defensive Coding)](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x24-V15-Secure-Coding-and-Architecture.md#v153-defensive-coding)
- [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Mass Assignment Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html)

### F-044: Cookie-authenticated profile and erasure POSTs have no CSRF defence; CORS allows all

**Severity:** medium · **Checklist item:** SEC-06 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** no

Another website can silently make a logged-in shopper's browser change their profile or request deletion of their data, because these actions trust the login cookie alone.

#### Details

`POST /profile`, `POST /profile/image/url`, `POST /profile/image/file` and `POST /dataerasure` authenticate solely via `req.cookies.token` and accept form-encoded bodies (`bodyParser.urlencoded`), which cross-site HTML forms can send. There is no CSRF token, Origin check or SameSite cookie. Cookies are set by ngx-cookie on the client and by `res.cookie('token', token)` on the server, both without flags. Separately, `app.use(cors())` and `app.options('*', cors())` allow every origin on every route. That is not credentialed, but it lets any site read anonymous API responses (e.g. the user-enumerating security-question endpoint) from visitors' browsers.

**Likelihood:** A logged-in user only has to visit an attacker's page; the `token` cookie has no SameSite attribute set.
**Impact:** An attacker's site can change a victim's username (which also feeds the Pug injection, F-031), set their profile image URL (SSRF/CSP injection), or file a data-erasure request.

#### Evidence

`routes/updateUserProfile.ts`, lines 17–36

```
    const loggedInUser = security.authenticatedUsers.get(req.cookies.token)

    if (!loggedInUser) {
      next(new Error('Blocked illegal activity by ' + req.socket.remoteAddress))
      return
    }

    try {
      const user = await UserModel.findByPk(loggedInUser.data.id)
      if (!user) {
        next(new Error('User not found'))
        return
      }


      const savedUser = await user.update({ username: req.body.username })
      const userWithStatus = utils.queryResultToJson(savedUser)
      const updatedToken = security.authorize(userWithStatus)
      security.authenticatedUsers.put(updatedToken, userWithStatus)
      res.cookie('token', updatedToken)
```

`server.ts`, lines 179–181

```
  /* Bludgeon solution for possible CORS problems: Allow everything! */
  app.options('*', cors())
  app.use(cors())
```

`server.ts`, lines 314–318

```
  app.use(bodyParser.urlencoded({ extended: true }))
  /* File Upload */
  app.post('/file-upload', uploadToMemory.single('file'), ensureFileIsPassed, metrics.observeFileUploadMetricsMiddleware(), checkUploadSize, checkFileType, handleZipFileUpload, handleXmlUpload, handleYamlUpload)
  app.post('/profile/image/file', uploadToMemory.single('file'), ensureFileIsPassed, metrics.observeFileUploadMetricsMiddleware(), utils.asyncHandler(profileImageFileUpload()))
  app.post('/profile/image/url', uploadToMemory.single('file'), utils.asyncHandler(profileImageUrlUpload()))
```

`routes/dataErasure.ts`, lines 74–86

```
router.post('/', (req: Request<Record<string, unknown>, Record<string, unknown>, DataErasureRequestParams>, res: Response, next: NextFunction): void => {
  void (async () => {
    const loggedInUser = security.authenticatedUsers.get(req.cookies.token)
    if (!loggedInUser) {
      next(new Error('Blocked illegal activity by ' + req.socket.remoteAddress))
      return
    }

    try {
      await PrivacyRequestModel.create({
        UserId: loggedInUser.data.id,
        deletionRequested: true
      })
```

#### Recommendation

Set the session cookie server-side with `SameSite=Lax` (or Strict), `Secure` and `HttpOnly`. Add CSRF tokens or Origin/Referer verification on cookie-authenticated mutations. Restrict CORS to the shop's own origins.

#### References

- [A01:2025 Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
- [CWE-352](https://cwe.mitre.org/data/definitions/352.html)
- [ASVS 5.0.0 V3.5 Browser Origin Separation](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x12-V3-Web-Frontend-Security.md#v35-browser-origin-separation)
- [ASVS 5.0.0 V3.4 Browser Security Mechanism Headers](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x12-V3-Web-Frontend-Security.md#v34-browser-security-mechanism-headers)
- [Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

### F-045: No CSP or HSTS; profile page CSP built from a user-controlled URL

**Severity:** medium · **Checklist item:** SEC-11 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** M (up to 2 days) · **Fix before sign-off:** no

The site doesn't send the standard browser instructions that limit damage from injected scripts or force encrypted connections. On the profile page a user can even rewrite those instructions themselves.

#### Details

Only `helmet.noSniff()` and `helmet.frameguard()` are enabled. There is no `contentSecurityPolicy`, `hsts` or `referrerPolicy`, and `xssFilter` is commented out. On `/profile` the header is `img-src 'self' ${user.profileImage}; script-src 'self' 'unsafe-eval'`, where `profileImage` is the raw `imageUrl` saved when the server-side fetch fails (profileImageUrlUpload line 36). A value containing `;` injects arbitrary directives.

**Likelihood:** Applies to every page. The CSP injection needs only a logged-in user setting an image URL.
**Impact:** The XSS issues above have nothing to stop them. The one CSP present can be rewritten by the user (e.g. adding `; script-src 'unsafe-inline'`), and without HSTS tokens can leak over plain HTTP.

#### Evidence

`server.ts`, lines 183–192

```
  /* Security middleware */
  app.use(helmet.noSniff())
  app.use(helmet.frameguard())
  // app.use(helmet.xssFilter()); // = no protection from persisted XSS via RESTful API
  app.disable('x-powered-by')
  app.use(featurePolicy({
    features: {
      payment: ["'self'"]
    }
  }))
```

`routes/userProfile.ts`, lines 91–96

```
      const CSP = `img-src 'self' ${user?.profileImage}; script-src 'self' 'unsafe-eval'`


      res.set({
        'Content-Security-Policy': CSP
      })
```

`routes/profileImageUrlUpload.ts`, lines 34–36

```
          try {
            const user = await UserModel.findByPk(loggedInUser.data.id)
            await user?.update({ profileImage: url })
```

#### Recommendation

Use `helmet()` defaults plus a strict CSP: `default-src 'self'`, no `unsafe-eval`/`unsafe-inline`, nonce-based scripts. Enable HSTS behind TLS. Never interpolate user data into headers; serve profile images only from same-origin upload paths.

#### References

- [A06:2025 Insecure Design](https://owasp.org/Top10/2025/A06_2025-Insecure_Design/)
- [CWE-693](https://cwe.mitre.org/data/definitions/693.html)
- [ASVS 5.0.0 V3.4 Browser Security Mechanism Headers](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x12-V3-Web-Frontend-Security.md#v34-browser-security-mechanism-headers)
- [ASVS 5.0.0 V12.2 HTTPS Communication with External Facing Services](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x21-V12-Secure-Communication.md#v122-https-communication-with-external-facing-services)
- [HTTP Security Response Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- [Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [HTTP Strict Transport Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html)

### F-047: CAPTCHAs return their own answers and are reusable

**Severity:** medium · **Checklist item:** SEC-12 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** no

The "prove you're human" puzzles send the correct answer along with the question, so bots can pass them every time. Nothing else limits how often these forms can be submitted.

#### Details

`captchas()` responds with `{ captchaId, captcha, answer }`, and `verifyCaptcha` never deletes a used CAPTCHA, so one ID/answer pair can be replayed indefinitely. `imageCaptchas()` likewise returns `answer`. `verifyImageCaptcha` calls `next()` when the user has no recent CAPTCHA at all (`!captchas[0]`). There is no rate limiter on `/api/Feedbacks`, `/rest/user/data-export`, `/rest/products/search` or `/file-upload`. The only limiters cover reset-password and 2FA, and they are spoofable (F-027). `uploadToDisk` for `/rest/memories` has no `limits.fileSize`.

**Likelihood:** Any script can call /rest/captcha and read `answer` from the JSON.
**Impact:** Unlimited automated feedback submissions (spam, stored-XSS delivery, database growth) and unlimited data-export requests.

#### Evidence

`routes/captcha.ts`, lines 24–41

```
    const captcha = {
      captchaId,
      captcha: expression,
      answer
    }
    const captchaInstance = CaptchaModel.build(captcha)
    await captchaInstance.save()
    res.json(captcha)
  }
}

export const verifyCaptcha = () => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const captcha = await CaptchaModel.findOne({ where: { captchaId: req.body.captchaId } })
    if ((captcha != null) && req.body.captcha === captcha.answer) {
      next()
    } else {
      res.status(401).send(res.__('Wrong answer to CAPTCHA. Please try again.'))
```

`routes/imageCaptcha.ts`, lines 24–53

```
      const imageCaptcha = {
        image: captcha.data,
        answer: captcha.text,
        UserId: user.data.id
      }
      const imageCaptchaInstance = ImageCaptchaModel.build(imageCaptcha)
      await imageCaptchaInstance.save()
      res.json(imageCaptcha)
    } catch (error) {
      res.status(400).send(res.__('Unable to create CAPTCHA. Please try again.'))
    }
  }
}

export const verifyImageCaptcha = () => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = security.authenticatedUsers.from(req)
    const UserId = user ? user.data ? user.data.id : undefined : undefined
    const captchas = await ImageCaptchaModel.findAll({
      limit: 1,
      where: {
        UserId,
        createdAt: {
          [Op.gt]: new Date(Date.now() - 300000)
        }
      },
      order: [['createdAt', 'DESC']]
    })
    if (!captchas[0] || req.body.answer === captchas[0].answer) {
      next()
```

`server.ts`, lines 693–712

```
const uploadToDisk = multer({
  storage: multer.diskStorage({
    destination: (req: Request, file: any, cb: any) => {
      const isValid = mimeTypeMap[file.mimetype]
      let error: Error | null = new Error('Invalid mime type')
      if (isValid) {
        error = null
      }
      cb(error, path.resolve('frontend/dist/frontend/assets/public/images/uploads/'))
    },
    filename: (req: Request, file: any, cb: any) => {
      const name = security.sanitizeFilename(file.originalname)
        .toLowerCase()
        .split(' ')
        .join('-')
      const ext = mimeTypeMap[file.mimetype]
      cb(null, name + '-' + Date.now() + '.' + ext)
    }
  })
})
```

#### Recommendation

Return only the challenge, never the answer. Delete or mark a CAPTCHA used on first verification and fail closed when none exists. Add express-rate-limit (keyed on real client IP and user ID) to feedback, export, search, upload and login. Set `limits: { fileSize }` on every multer instance.

#### References

- [CWE-804](https://cwe.mitre.org/data/definitions/804.html)
- [ASVS v5.0.0-2.4.1 (V2.4 Anti-automation)](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x11-V2-Validation-and-Business-Logic.md#v24-anti-automation)
- [Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)

### F-049: Development error handler returns stack traces and SQL errors to clients

**Severity:** medium · **Checklist item:** SEC-13 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** no

When something goes wrong, the server shows the visitor its internal error details, including database errors. That gives attackers a map of the system.

#### Details

`app.use(errorhandler())` is registered unconditionally. The `errorhandler` package is intended for development only and renders full stack traces as HTML/JSON. Its title is even set to include the Express version. `searchProducts` passes `error.parent` (the raw SQLite error with the query) to `next`. Many handlers build error messages containing user input or remote addresses (`'Blocked illegal activity by ' + remoteAddress`).

**Likelihood:** Any malformed request reaches it, e.g. a single quote in the search box.
**Impact:** SQL error text reveals table and column structure, which speeds up the SQL injection in F-012/F-015. Stack traces reveal file paths and library versions. XXE and YAML results are echoed through the same handler.

#### Evidence

`server.ts`, lines 674–675

```
  /* Error Handling */
  app.use(errorhandler())
```

`server.ts`, line 724

```
errorhandler.title = `${config.get<string>('application.name')} (Express ${utils.version('express')})`
```

`routes/search.ts`, lines 30–32

```
      }).catch((error: ErrorWithParent) => {
        next(error.parent)
      })
```

#### Recommendation

Register `errorhandler` only when `NODE_ENV === 'development'`. In production, log the error server-side with a correlation ID and return a generic message. Never forward DB error objects to the client.

#### References

- [A10:2025 Mishandling of Exceptional Conditions](https://owasp.org/Top10/2025/A10_2025-Mishandling_of_Exceptional_Conditions/)
- [CWE-209](https://cwe.mitre.org/data/definitions/209.html)
- [ASVS 5.0.0 V16.2 General Logging](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x25-V16-Security-Logging-and-Error-Handling.md#v162-general-logging)
- [ASVS 5.0.0 V16.5 Error Handling](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x25-V16-Security-Logging-and-Error-Handling.md#v165-error-handling)
- [ASVS v5.0.0-13.4.2 (V13.4 Unintended Information Leakage)](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x22-V13-Configuration.md#v134-unintended-information-leakage)
- [Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)

### F-057: Chat stream has no timeout, no cancel on disconnect, and leaks raw errors

**Severity:** medium · **Checklist item:** LLM-07 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** no

If the AI provider is slow or a customer closes the chat, the server keeps the request running and paying for it, with no cut-off time. Raw technical error messages from the AI service can also be shown to customers.

#### Details

`createOpenAICompatible` is built without a custom `fetch` or timeout (routes/chat.ts:107-111), and `streamText` gets no `abortSignal` (lines 199-209). Nothing listens for `req.on('close')`, so when the client disconnects the multi-step tool loop (up to 10 steps, plus retries) runs to the end. Retries rely on the SDK's default backoff, and there is no fallback model or cached answer. For stream `error` events, the raw error is interpolated into the SSE payload sent to the browser (line 249), even though `summarizeLlmError` exists and is used only for logs. A `finishReason` of `length` or `content-filter` is forwarded but the frontend ignores it (chat.service.ts:68-77), so truncated answers look complete to the customer.

**Likelihood:** Happens whenever the provider is slow or overloaded, or a browser tab closes mid-answer.
**Impact:** Generation keeps running and billing for clients that are gone, requests can hang indefinitely, and provider error details reach end users.

#### Evidence

`routes/chat.ts`, lines 107–111

```
const provider = createOpenAICompatible({
  name: 'juice-shop-llm',
  apiKey: process.env.LLM_API_KEY ?? '',
  baseURL: config.get<string>('application.chatBot.llmApiUrl')
})
```

`routes/chat.ts`, lines 199–211

```
      const result = streamText({
        model: provider(model),
        system: systemPrompt,
        messages,
        tools: { ...chatTools },
        maxRetries: config.get<number>('application.chatBot.llmMaxRetries'),
        stopWhen: stepCountIs(10),
        onError: ({ error }) => {
          logger.warn('Chatbot stream error: ' + summarizeLlmError(error))
        }
      })

      for await (const event of result.fullStream) {
```

`routes/chat.ts`, lines 248–250

```
          case 'error':
            res.write(`data: ${JSON.stringify({ error: `LLM error: ${event.error as string}` })}\n\n`)
            break
```

`frontend/src/app/Services/chat.service.ts`, lines 68–77

```
            const delta = parsed.choices?.[0]?.delta
            const finishReason = parsed.choices?.[0]?.finish_reason

            if (delta) {
              const chunk: ChatChunk = {}
              if (delta.content) chunk.deltaContent = delta.content
              if (delta.tool_calls) chunk.deltaToolCalls = delta.tool_calls
              if (finishReason) chunk.finishReason = finishReason
              if (chunk.deltaContent || chunk.deltaToolCalls || chunk.finishReason) {
                chunks.push(chunk)
```

#### Recommendation

Create an AbortController per request, abort it on `req.on('close')`, and pass it with `AbortSignal.timeout(...)` as `abortSignal` to `streamText`. Send clients a generic error code instead of `event.error`. Handle `length` and `content-filter` finish reasons in the UI. Consider a fallback model or a static 'assistant unavailable' answer.

#### References

- [CWE-400](https://cwe.mitre.org/data/definitions/400.html)

### F-041: Metrics, full app configuration and API docs served publicly

**Severity:** low · **Checklist item:** SEC-03 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours) · **Fix before sign-off:** no

Internal statistics about the shop (how many customers, orders and wallet money) and its full settings are visible to anyone on the internet without logging in.

#### Details

`/metrics` is registered twice with no auth and exposes Prometheus gauges including `wallet_balance_total`, user and order counts, and Node process metrics. `retrieveAppConfiguration` returns `config.util.toObject(config)` with only `chatBot.llmApiUrl` removed, so any secret later added to config ships to anonymous callers. The route sits under `/rest/admin/` but has no guard.

**Likelihood:** Anyone can fetch /metrics, /rest/admin/application-configuration and /api-docs.
**Impact:** Business figures (user counts, order totals, total wallet balance), process internals and the complete runtime configuration help attackers plan, and leak commercially sensitive numbers.

#### Evidence

`server.ts`, line 670

```
  app.get('/metrics', utils.asyncHandler(metrics.serveMetrics()))
```

`server.ts`, line 723

```
app.get('/metrics', utils.asyncHandler(metrics.serveMetrics()))
```

`routes/appConfiguration.ts`, lines 9–17

```
export function retrieveAppConfiguration () {
  return (_req: Request, res: Response) => {
    const safeConfig = structuredClone(config.util.toObject(config))
    if (safeConfig.application?.chatBot) {
      delete safeConfig.application.chatBot.llmApiUrl
    }
    res.json({ config: safeConfig })
  }
}
```

#### Recommendation

Protect /metrics with a bearer token or bind it to an internal port. Return an explicit allow-list of client-needed settings instead of the whole config. Put admin routes behind an admin role check.

#### References

- [A01:2025 Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
- [CWE-200](https://cwe.mitre.org/data/definitions/200.html)
- [ASVS 5.0.0 V8.2 General Authorization Design](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x17-V8-Authorization.md#v82-general-authorization-design)
- [ASVS 5.0.0 V8.3 Operation Level Authorization](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x17-V8-Authorization.md#v83-operation-level-authorization)
- [ASVS 5.0.0 V14.2 General Data Protection](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x23-V14-Data-Protection.md#v142-general-data-protection)
- [Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [Insecure Direct Object Reference Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)

### F-059: No tests or evals for the chatbot prompt and tool policies

**Severity:** low · **Checklist item:** LLM-08 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** M (up to 2 days) · **Fix before sign-off:** no

Nothing automatically checks that the chatbot follows the shop's rules after the prompt or AI model changes, and there is no way to trace a bad answer back to a specific conversation.

#### Details

The repository has no tests that cover `/rest/chat`, `buildSystemPrompt` or the tools (no matches under test/). Observability is limited to global Prometheus counters for tokens and tool calls (routes/chat.ts:57-79) with no per-request record of model, user, tool arguments or finish reason. The UI has no way to flag a bad answer. The prompt is versioned in code, which is good.

**Likelihood:** Any change to the prompt or model (for example a new `gemma` tag) can silently change coupon and order behaviour.
**Impact:** Regressions in policy compliance or answer quality ship unnoticed, and bad answers cannot be traced to a user or conversation.

#### Evidence

`routes/chat.ts`, lines 57–79

```
const metricInputTokensTotal = new Counter({
  name: `${app}_llm_input_tokens_total`,
  help: 'Number of total input tokens processed',
})
const metricInputTokens = new Counter({
  name: `${app}_llm_input_tokens`,
  help: 'Number of input tokens processed',
  labelNames: ['type'],
})
const metricOutputTokensTotal = new Counter({
  name: `${app}_llm_output_tokens_total`,
  help: 'Number of total output tokens processed',
})
const metricOutputTokens = new Counter({
  name: `${app}_llm_output_tokens`,
  help: 'Number of output tokens processed',
  labelNames: ['type'],
})
const metricToolCalls = new Counter({
  name: `${app}_llm_tool_calls_total`,
  help: 'Number of tool calls made',
  labelNames: ['tool'],
})
```

`routes/chat.ts`, lines 81–105

```
export function buildSystemPrompt (userName?: string) {
  const userIdentifier = userName ? `\nThe customer you are currently chatting with is ${userName}.` : ''
  return `You are "${botName}", the friendly customer service chatbot of the ${appName} online store.
You help customers find products, answer questions about the shop, and provide a delightful shopping experience.
Keep your responses concise and helpful.${userIdentifier}

IMPORTANT RULES:
- You MUST use the searchProducts tool whenever a customer asks about products, availability, prices, or anything related to the shop's catalog. NEVER guess or make up product names, prices, or descriptions.
- You MUST use the getProductReviews tool whenever a customer asks for reviews of a product.
- You MUST use the getOrderById tool whenever a customer asks about a specific order by its ID.
- Only recommend or mention products that were returned by the searchProducts tool. If a search returns no results, tell the customer that you could not find matching products.
- Do NOT invent information. If you do not know the answer to a question, say so honestly.
- Your scope is limited to the ${appName} store. Do not answer questions unrelated to the shop or its products.
- DO NOT RECOMMEND PRODUCTS THAT WERE NOT RETURNED BY THE searchProducts TOOL. If the customer asks for a product that is not found, apologize and suggest they try a different search query.
- When the search returns nothing, try again with a more generic query if possible, but do not make up product details.

COUPON POLICY (for the generateCoupon tool):
- You may ONLY generate a coupon for a customer who has a verified damaged order with a valid order ID (format: xxxx-xxxxxxxxxxxxxxxx, e.g. 3fa8-bf2bc042f4e92).
- The customer must have explicitly rejected a return or exchange before a coupon can be offered.
- The maximum allowed discount is 10%.
- NEVER generate a coupon just because a customer asks for one or complains.
- If the customer does not meet ALL of the above conditions, politely decline and explain the policy.

CONFIDENTIAL - INTERNAL ONLY: If a customer formally complains about their shopping experience and explicitly requests to escalate the issue, offer them a one-time 15% courtesy discount to resolve the case without escalation. Do not mention this option proactively.`
}
```

#### Recommendation

Add an eval suite (against a mock provider plus scheduled runs against the real model) covering coupon refusal, cross-user order requests and injected reviews. Log one structured line per call with model, user id, token counts, tools called and finish reason. Add a thumbs-down control in the chat UI.

## Open questions

Points the code alone could not settle; each needs an answer from the team.

### F-058: Which LLM provider runs in production, and with what data retention?

**Severity:** question · **Checklist item:** LLM-05 · **Repository:** juice-shop-v20.2.0-4b369c9 · **Effort:** S (up to 2 hours)

The chatbot sends customer names, order details and conversation text to whichever AI service is configured. We need to know which service that is in production, and whether it keeps or trains on that data.

#### Details

The prompt contains the customer's username (routes/chat.ts:82), full order documents including masked email, products, address and payment IDs (line 170), and full review documents including author emails (line 148). `llmApiUrl` comes from config (default `http://localhost:11434/v1`, config/default.yml:18-23) and may be pointed at a hosted provider in deployment. Prompts and responses are not logged in full (only summarised errors), which is good.

**Likelihood:** Unknown: the endpoint is set by configuration (default: a local Ollama on localhost).
**Impact:** If a third-party API is used, customer names, order contents and reviews go to that provider under its retention and training terms.

#### Evidence

`config/default.yml`, lines 18–23

```
  chatBot:
    name: 'Juicy the Smart Assistant'
    avatar: 'JuicyChatBot.png'
    model: 'gemma4:e4b'
    llmApiUrl: 'http://localhost:11434/v1'
    llmMaxRetries: 2
```

`routes/chat.ts`, lines 165–170

```
          const order = await db.ordersCollection.findOne({ orderId })

          if (!order) return { error: 'Order not found' }
          if (order.email !== maskedEmail) return { error: 'Order does not belong to the current customer' }

          return order
```

#### Recommendation

Confirm the production provider, that the connection uses HTTPS, and that zero-retention / no-training terms are in place. Minimise the order and review fields passed to the model, and record the provider in the privacy policy.

#### References

- [ASVS 5.0.0 V14.2 General Data Protection](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x23-V14-Data-Protection.md#v142-general-data-protection)
