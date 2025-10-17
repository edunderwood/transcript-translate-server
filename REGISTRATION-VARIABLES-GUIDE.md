# Registration Variables Usage Guide

This document shows where each variable collected during registration appears in the client (participant) interface.

## Registration Process

The registration is split into two steps:
1. **Step 1: Organisation Profile** (`/complete-setup-org`)
2. **Step 2: Client Appearance** (`/complete-setup-client`)

---

## Variables and Where They Appear

### Step 1: Organisation Profile Variables

These variables are primarily for administrative purposes and do NOT appear directly to participants:

| Variable | Field Name | Where Used | Visible to Participants? |
|----------|-----------|------------|-------------------------|
| `organisationName` | Organisation Name | Database record, Control panel header, QR code generation | ❌ No (Admin only) |
| `contactName` | Contact Person Name | Database record, Organisation settings | ❌ No (Admin only) |
| `contactPhone` | Contact Phone | Database record, Organisation settings | ❌ No (Admin only) |

**Example in Control Panel:**
```
┌─────────────────────────────────┐
│  Open Word Control Panel        │
│  Organisation: [Firmus Tech]    │ ← organisationName displayed here
│  Contact: [John Smith]          │ ← contactName displayed here
└─────────────────────────────────┘
```

---

### Step 2: Client Appearance Variables

These variables ARE visible to participants and define the client experience:

#### 1. `hostLanguage` - Host Language
**Where It Appears:**
- Default language selector on client interface
- Used as the source language for translations
- Displayed as the primary language option

**Client Display Example:**
```
┌─────────────────────────────────┐
│  [Firmus Technology Logo]       │
│                                  │
│  Language: [English ▼]          │ ← hostLanguage as default
│                                  │
│  Select translation:             │
│  ○ English                       │ ← hostLanguage listed first
│  ○ Spanish                       │
│  ○ French                        │
└─────────────────────────────────┘
```

**Database Field:** `host_language`
**Example Values:** `"en"` (English), `"es"` (Spanish), `"fr"` (French)

---

#### 2. `translationLanguages` - Translation Languages (1-5 selections)
**Where It Appears:**
- Language selection dropdown/radio buttons on client
- Each selected language appears as an available translation option

**Client Display Example:**
```
┌─────────────────────────────────┐
│  Select Your Language:           │
│                                  │
│  ○ English (Host)               │ ← hostLanguage
│  ○ Spanish                      │ ← translationLanguages[0]
│  ○ French                       │ ← translationLanguages[1]
│  ○ Polish                       │ ← translationLanguages[2]
│  ○ Arabic                       │ ← translationLanguages[3]
└─────────────────────────────────┘
```

**Database Field:** `translation_languages` (array)
**Example Value:** `["es", "fr", "pl", "ar"]`

---

#### 3. `greeting` - Greeting Text
**Where It Appears:**
- Top of the client interface as the main welcome message
- First text participants see when accessing the service

**Client Display Example:**
```
┌─────────────────────────────────┐
│  [Logo]                         │
│                                  │
│  Welcome to Our Service!        │ ← greeting displayed here
│                                  │
│  Please select your language... │
└─────────────────────────────────┘
```

**Database Field:** `greeting`
**Example Value:** `"Welcome to Our Service!"`
**Default:** `"Welcome!"`

---

#### 4. `message` - Welcome Messages (array of 1-3 messages)
**Where It Appears:**
- Below the greeting as bullet points or numbered list
- Provides instructions or information to participants

**Client Display Example:**
```
┌─────────────────────────────────┐
│  Welcome to Our Service!        │
│                                  │
│  • Select your language below   │ ← message[0]
│  • Translations will begin      │ ← message[1]
│    when the speaker starts      │
│  • Adjust volume if needed      │ ← message[2]
│                                  │
└─────────────────────────────────┘
```

**Database Field:** `message` (array)
**Example Value:**
```json
[
  "Select your language below",
  "Translations will begin when the speaker starts",
  "Adjust volume if needed"
]
```
**Default:** `[]` (empty array)

---

#### 5. `additionalWelcome` - Additional Welcome Message
**Where It Appears:**
- Below the main messages as additional context
- Optional extra information for participants

**Client Display Example:**
```
┌─────────────────────────────────┐
│  • Select your language below   │
│  • Translations will begin...   │
│                                  │
│  For technical support,         │ ← additionalWelcome
│  please contact our team.       │    displayed here
│                                  │
└─────────────────────────────────┘
```

**Database Field:** `additional_welcome`
**Example Value:** `"For technical support, please contact our team."`
**Default:** `""` (empty string)

---

#### 6. `waitingMessage` - Waiting/Offline Message
**Where It Appears:**
- **ONLY when the service is OFFLINE** (control panel not active)
- Replaces the normal interface with this message

**Client Display - When Service is OFFLINE:**
```
┌─────────────────────────────────┐
│  [Logo]                         │
│                                  │
│  🔴                             │
│                                  │
│  Translation service is         │ ← waitingMessage
│  currently offline              │    displayed here
│                                  │
│  Please check back later        │
│                                  │
└─────────────────────────────────┘
```

**Database Field:** `waiting_message`
**Example Value:** `"Translation service is currently offline"`
**Default:** `"Service is currently offline"`

---

#### 7. `logoBase64` - Organisation Logo
**Where It Appears:**
- Top center of client interface
- Displayed as an image above all content
- Provides visual branding

**Client Display Example:**
```
┌─────────────────────────────────┐
│                                  │
│      [🏢 FIRMUS TECHNOLOGY]     │ ← logoBase64 displayed
│           [LOGO IMAGE]           │    as image here
│                                  │
│  Welcome to Our Service!        │
│                                  │
└─────────────────────────────────┘
```

**Database Field:** `logo_base64`
**Format:** Base64-encoded image string
**Example Value:** `"data:image/png;base64,iVBORw0KGgoAAAANS..."`
**Default:** `""` (no logo shown)

**Image Requirements:**
- Formats: PNG, JPG, SVG
- Recommended size: 200x200px to 400x400px
- Max file size: 1MB
- Aspect ratio: Square or horizontal rectangle

---

## Complete Client Interface Example

Here's how all variables come together in the participant view:

### When Service is ACTIVE:

```
┌─────────────────────────────────────────┐
│                                          │
│      [🏢 FIRMUS TECHNOLOGY LOGO]        │ ← logoBase64
│                                          │
│    Welcome to Our Service!              │ ← greeting
│                                          │
│    • Select your language below         │ ← message[0]
│    • Translations will begin when       │ ← message[1]
│      the speaker starts                  │
│    • Adjust volume if needed            │ ← message[2]
│                                          │
│    For technical support, contact       │ ← additionalWelcome
│    our team.                             │
│                                          │
│    ┌─────────────────────────────────┐  │
│    │ Select Your Language:            │  │
│    │                                  │  │
│    │ ○ English (Host)                │  │ ← hostLanguage
│    │ ○ Spanish                       │  │ ← translationLanguages[0]
│    │ ○ French                        │  │ ← translationLanguages[1]
│    │ ○ Polish                        │  │ ← translationLanguages[2]
│    │ ○ Arabic                        │  │ ← translationLanguages[3]
│    │                                  │  │
│    │ [Connect]                       │  │
│    └─────────────────────────────────┘  │
│                                          │
└─────────────────────────────────────────┘
```

### When Service is OFFLINE:

```
┌─────────────────────────────────────────┐
│                                          │
│      [🏢 FIRMUS TECHNOLOGY LOGO]        │ ← logoBase64
│                                          │
│                                          │
│              🔴 OFFLINE                  │
│                                          │
│    Translation service is currently     │ ← waitingMessage
│    offline                               │
│                                          │
│    Please check back later              │
│                                          │
└─────────────────────────────────────────┘
```

---

## Variables NOT Visible to Participants

The following administrative data is stored but NOT shown to participants:

| Variable | Purpose | Where Visible |
|----------|---------|---------------|
| `user_id` | Links organisation to user account | Database only |
| `organisation_key` | Unique identifier for URLs | URL only (`?organisationKey=NEFC`) |
| `default_service_id` | Service identifier | Database, control panel |
| `contactName` | Admin contact person | Control panel settings |
| `contactPhone` | Admin phone number | Control panel settings |
| `monthly_fee` | Pricing | Control panel settings |
| `price_per_character` | Pricing | Control panel settings |

---

## Testing Your Configuration

To see how your registration variables appear to participants:

1. **Complete Registration** with your desired settings
2. **Access the client URL**: `https://your-domain.com/?organisationKey=YOUR_KEY`
3. **Test with service ACTIVE**: Start service from control panel
4. **Test with service OFFLINE**: Stop service from control panel

---

## Mobile Preview During Registration

During registration (Step 2: Client Appearance), you can see a live preview of how these variables will appear on a mobile device. The preview updates as you type!

```
Registration Form              Mobile Preview
┌──────────────────┐          ┌──────────────┐
│ Greeting: [...]  │   →     │  [Logo]      │
│                  │   →     │  Greeting    │
│ Message 1: [...] │   →     │  • Message 1 │
│ Message 2: [...] │   →     │  • Message 2 │
│                  │          │              │
│ Logo: [Upload]   │   →     │  (Preview)   │
└──────────────────┘          └──────────────┘
```

---

## Summary Table

| Variable | Registration Step | Visible to Participants | When Visible |
|----------|------------------|------------------------|--------------|
| organisationName | Step 1 | ❌ No | Admin only |
| contactName | Step 1 | ❌ No | Admin only |
| contactPhone | Step 1 | ❌ No | Admin only |
| hostLanguage | Step 2 | ✅ Yes | Always |
| translationLanguages | Step 2 | ✅ Yes | Always |
| greeting | Step 2 | ✅ Yes | Always |
| message | Step 2 | ✅ Yes | Always |
| additionalWelcome | Step 2 | ✅ Yes | Always |
| waitingMessage | Step 2 | ✅ Yes | When service offline |
| logoBase64 | Step 2 | ✅ Yes | If uploaded |

---

## API Response Example

When a client fetches organisation data, they receive:

```json
{
  "success": true,
  "responseObject": {
    "name": "Firmus Technology",
    "greeting": "Welcome to Our Service!",
    "message": "[\"Select your language\",\"Translations begin when speaker starts\"]",
    "additionalWelcome": "For technical support, contact our team",
    "waiting": "Translation service is currently offline",
    "logo": "data:image/png;base64,iVBORw0KGg...",
    "base64Logo": "data:image/png;base64,iVBORw0KGg...",
    "language": "en",
    "translationLanguages": "[\"es\",\"fr\",\"pl\",\"ar\"]",
    "defaultServiceId": "service_abc123"
  }
}
```

---

## Questions?

- **Where do I update these after registration?**
  Control Panel → Hamburger Menu → Client Settings

- **Can I change the logo later?**
  Yes, in Client Settings

- **Do participants see my contact info?**
  No, only admins see contact info in Organisation Settings

- **How many welcome messages can I have?**
  1-3 messages in the `message` array

- **Can I use HTML in messages?**
  No, only plain text is supported
