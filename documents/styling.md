Your choices of `shadcn/ui`, `Playfair Display`, and a green primary color give us a fantastic starting point. `shadcn/ui` is a brilliant, modern component base, and your instincts on typography and color are spot-on for the academic and sophisticated feel we're aiming for.

Let's build on that to create a professional design reference. A key principle in typography is to pair a distinct *display* font (for headings) with a clean, readable *body* font (for paragraphs and UI elements).

`Playfair Display` is a perfect, high-character display font. For the body, I'll suggest `Inter`, a highly-legible and neutral sans-serif that will let `Playfair Display` shine without competing with it.

Here is a proposed reference guide.

-----

### Design Reference: Colors & Typography - V1

#### 1\. Typography

The typographic scale will create a clear hierarchy between headings and content, giving the application a polished, literary feel.

| Role          | Font Family         | Weight(s)        | Notes                                                                                             |
| :------------ | :------------------ | :--------------- | :------------------------------------------------------------------------------------------------ |
| **Headings** | `Playfair Display`  | `500` (Medium)   | For main page titles (`h1`), section titles (`h2`), and large, impactful text. Elegant and classic. |
| **Body & UI** | `Inter`             | `400` (Regular)  | For all paragraphs, labels, buttons, and other interface text. Clean, modern, and highly readable. |
| **Bold Text** | `Inter`             | `600` (Semi-Bold)| For emphasis within body copy.                                                                    |

#### 2\. Color Palette

We'll build the palette around a sophisticated, academic green. This won't be a bright, techy green, but something deeper and more calming, which suits the subject matter. We'll pair it with a warm, neutral gray scale (`Slate` from the Tailwind palette) and functional colors for user feedback.

| Color Name        | Hex Code      | Role                                                                    |
| :---------------- | :------------ | :---------------------------------------------------------------------- |
| **Forest Green** | `#166534`     | **Primary/Brand:** For primary buttons, active links, and key brand elements. |
| **Light Green** | `#ECFDF5`     | **Primary Foreground:** A very light shade for backgrounds on colored sections. |
| **Slate (Dark)** | `#1E293B`     | **Text/Headings:** The primary color for all text. High contrast and readable. |
| **Slate (Medium)**| `#94A3B8`     | **Subtle Text:** For secondary information, placeholders, and disabled text. |
| **Slate (Light)** | `#F1F5F9`     | **Background:** The main background color for the app. Clean and light.    |
| **Slate (Card)** | `#FFFFFF`     | **Card Background:** The background for cards, text areas, and modals.     |
| **Success** | `#22C55E`     | **Functional:** For success messages, like the "green checkmark" on upload.   |
| **Warning** | `#F59E0B`     | **Functional:** For non-critical warnings or alerts.                       |
| **Destructive** | `#EF4444`     | **Functional:** For error messages, delete buttons, and critical alerts.    |

#### 3\. `shadcn/ui` Theme Mapping

Here is how we would translate this palette directly into the CSS variables for your `shadcn/ui` theme. You can place this in your `globals.css` file.

```css
/* In your globals.css file */
@layer base {
  :root {
    --background: 240 6% 96%; /* Slate (Light) - F1F5F9 */
    --foreground: 222 47% 11%; /* Slate (Dark) - 1E293B */

    --card: 0 0% 100%; /* Slate (Card) - FFFFFF */
    --card-foreground: 222 47% 11%; /* Slate (Dark) - 1E293B */

    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;

    --primary: 158 64% 24%; /* Forest Green - 166534 */
    --primary-foreground: 156 88% 97%; /* Light Green - ECFDF5 */

    --secondary: 240 6% 96%; /* Slate (Light) - F1F5F9 */
    --secondary-foreground: 222 47% 11%;

    --muted: 240 6% 96%;
    --muted-foreground: 215 20% 65%; /* Slate (Medium) - 94A3B8 */

    --accent: 240 6% 96%;
    --accent-foreground: 222 47% 11%;

    --destructive: 0 84% 60%; /* Destructive - EF4444 */
    --destructive-foreground: 0 0% 100%;

    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 158 64% 24%; /* Forest Green for focus rings */

    --radius: 0.5rem;
  }
}
```

-----

This provides a complete, actionable guide for creating a visually cohesive and beautiful front end that aligns with your vision.
