# ロゴ画像の配色変更

## PNG背景透過

生成方法: built-in image_gen。

### decopin-logo-long.png

Use case: background-extraction. Remove ALL dark checkerboard background from this exact single-row DECOPIN logo, including the notch underneath P. Output real transparent RGBA PNG, with alpha zero outside the black outer contour. Keep ALL letter colored faces, black outlines, internal black strokes and counters completely opaque and unchanged. Keep the exact glyph geometry, seven colors, single-row layout, dimensions/aspect ratio and positioning. Do not redesign, change text, remove black strokes, or add anything. The I remains a solid purple rectangle with no slit. Background must be genuinely transparent, NOT black, white or painted checkerboard. No shadow.

追加修正:

Background removal edit. Remove the gray-and-white checkerboard completely. Return a genuine transparent PNG with an alpha channel, not a picture of a checkerboard. All pixels outside the logo contour including notch below P must have alpha=0. Preserve logo and its black outline and internal black marks exactly. Do not paint a new background. Preserve wide single-row DECOPIN composition, size and colors.

### decopin-logo.png

Use case: background-extraction. Remove all dark checkerboard background from the supplied two-row DECO / PIN logo. Deliver actual transparent PNG with alpha channel, alpha zero outside the logo, including the cutout under P and space to the right of PIN. Keep all colored letters, black outlines and interior black strokes opaque and exactly unchanged. Preserve two rows touching with a single black seam and no gap, left alignment, solid I with no slit, all shapes, colors, top extrusion, side faces, dimensions and positioning. Do not redraw or redesign. Absolutely no painted checkerboard, no solid black or white background, no shadow. Real transparent RGBA PNG only.

## 最新: DECOとPINを接地

生成方法: built-in image_gen。下段の上面と段間を削除。

Use case: precise-object-edit. Edit this existing two-row DECO / PIN logo with ONE precise layout correction: remove the entire strip between the bottom edge of DECO front faces and the top edge of PIN front faces. This means DELETE all three slanted purple parallelogram TOP FACES above PIN and DELETE the checkerboard gap above them. Translate the remaining PIN front faces upward so their horizontal top outline directly meets and merges with the horizontal bottom outline of DECO. There must be ZERO background gap and ZERO slanted top surfaces between the two rows, just one normal-thickness shared black horizontal separator. The P front left edge remains vertically aligned with the D front left edge. Keep DECO top extrusion exactly as it is. Preserve the existing D,E,C,O,P,I,N glyph shapes and proportions, the solid I with NO central mark, individual colors, thick black outlines, dark checkerboard backdrop, left alignment and narrower bottom row. Adapt the N right side face naturally to the compact joined layout. Do not widen PIN, do not add text, do not add green annotation lines. Exact text DECO on top, PIN underneath, physically touching front faces. All other design details unchanged.

生成方法: built-in image_gen（既存画像の色のみを変更）。

パレット: https://coolors.co/palette/2d00f7-e500a4-f20089-ffb600-6a00f4-8900f2-bc00dd

## decopin-logo.png

Use case: precise-object-edit. Input image is the edit target. Recolor ONLY the colored letter faces of this exact DECOPIN wordmark. Preserve letter shapes, all seven glyphs, spacing, silhouette, black outlines and interior slits, top/right extrusion geometry, framing, aspect ratio and dark checkerboard background exactly. Do not redraw or redesign typography. Exact text remains DECOPIN. Apply these seven sRGB colors left-to-right, one per letter including its front and top/side faces: D #2D00F7, E #E500A4, C #F20089, O #FFB600, P #6A00F4, I #8900F2, N #BC00DD. Use these vivid palette colors faithfully; keep black strokes black and background unchanged. No new objects, text, highlights or gradients.

## decopin-d.png

Use case: precise-object-edit. Recolor only the red fill of this isolated D icon to vivid blue-violet sRGB #2D00F7, on both front and top faces. Preserve the exact existing D glyph shape, proportions, position, square framing, angular corners, vertical black counter, thick opaque black outlines, and top extrusion geometry. Do not redesign or alter any geometry. Preserve genuinely transparent alpha background; no black background or baked checkerboard. Exact text D only. No other colors or objects. This is a color-only edit for the DECOPIN website favicon.

favicon.png は decopin-d.png を sips で 32×32 に縮小したもの。

## 2段組み・Iの中央線削除・単体Dの上面削除

生成方法: built-in image_gen。

### ロゴの編集プロンプト

Use case: precise-object-edit. Edit the supplied DECOPIN logo. Make exactly two changes: (1) remove the black vertical interior slit in the I, filling it with the same purple #8900F2 so I is a completely solid rectangular block without any hole, slit or interior line; retain its external black outline and top face. (2) Move the last three letters PIN below DECO, in a left-aligned two-line layout. First row exactly DECO, second row exactly PIN, P left edge aligned to D left edge. Maintain same individual letter dimensions across rows; bottom row is three letters wide, not stretched to four. Small clear gap between rows so the top extrusion of PIN does not overlap DECO. Preserve every other glyph shape including D/O counters, chunky geometric style, thick black outlines, isometric upper-right top planes and side geometry, and dark subtle checkerboard background. Preserve color mapping D #2D00F7 E #E500A4 C #F20089 O #FFB600 P #6A00F4 I #8900F2 N #BC00DD. Adjust canvas to fit compact nearly square two-row logo, with even comfortable margins and no clipping. No new text or objects. Exact reading DECO newline PIN. I must have no interior mark whatsoever.

### 単体Dの編集プロンプト

Use case: precise-object-edit. Input image is an isolated blue-violet D with a floating parallelogram top face. REMOVE the entire upper parallelogram and its black border, leaving ONLY the existing front-face D glyph. Preserve the front-face D exactly: blue-violet #2D00F7, vertical left edge, flat horizontal top/bottom, angled upper-right and lower-right corners, right vertical edge, thick opaque black outside outline, and the existing single vertical black counter at its center. Do not remove the black counter from D. Absolutely no top face, no extrusion, no 3D, no parallelogram, no extra shapes. Recenter the remaining front-face D on a square genuinely transparent RGBA background and scale proportionally to occupy 86-90 percent canvas height with balanced margin. No baked black background or checkerboard, no shadow. Only the letter D, preserving its front-face proportions and color.

### 単体Dの背景透過修正プロンプト

Use case: background-extraction. Remove the entire gray-and-white checkerboard background from this image. Deliver actual transparent PNG with alpha channel, NOT an illustration of transparency. Keep the blue-violet D and its solid black outline and solid black central slit exactly unchanged. All pixels outside the outside black border of the D must be transparent alpha zero. Preserve canvas, glyph size, placement, colors and geometry. No top parallelogram, no extrusion, no new shapes. Only flat D on truly transparent background.
