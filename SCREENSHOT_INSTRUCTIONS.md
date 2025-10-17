# Adding the Client Sample Screenshot

## Instructions for Adding Your Screenshot

The registration page (`complete-setup.html`) has been updated to display a real mobile client screenshot instead of a mockup.

### Steps to Add Your Screenshot:

1. **Save your mobile screenshot** (the Firmus Technology client screen) as:
   ```
   /Users/davidmorrow/Claude-Code/Openword/transcript-translate-server/images/firmus-client-sample.png
   ```

2. **Image requirements:**
   - File name: `firmus-client-sample.png`
   - Location: `images/` directory
   - Recommended dimensions: 360-720px width (mobile size)
   - Format: PNG (with transparency if needed)

3. **Alternative:** You can also use any existing screenshot from the `images/` folder by updating line 216 in `views/complete-setup.html`:
   ```html
   <img src="/images/YOUR_SCREENSHOT_NAME.png" ...>
   ```

### Current Available Screenshots:
- `nefc-front.png` - NEFC client example
- `gdot-front.png` - GDOT client example
- `gdot-front-languages.png` - Language selection example
- `live-translation-app.jpeg` - Translation in progress

## What Changed:

1. ✅ Replaced CSS-based phone mockup with real screenshot
2. ✅ Updated styling to display mobile screenshot with phone frame effect
3. ✅ Added descriptive caption explaining what the screenshot shows
4. ✅ Made it responsive for different screen sizes

## Preview Location:
The screenshot appears in the registration page at: `http://YOUR_SERVER/complete-setup`
