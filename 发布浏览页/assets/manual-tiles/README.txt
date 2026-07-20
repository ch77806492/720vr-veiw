Manual panorama tile folder.

Use this folder when you do not want the editor to generate many files automatically.

Recommended stable scheme:

1. Create one folder per scene, for example:
   assets/manual-tiles/out-gate/

2. Put six cube faces in these face folders:
   assets/manual-tiles/out-gate/f/
   assets/manual-tiles/out-gate/r/
   assets/manual-tiles/out-gate/b/
   assets/manual-tiles/out-gate/l/
   assets/manual-tiles/out-gate/u/
   assets/manual-tiles/out-gate/d/

3. If Grid per face = 1, each face contains only:
   1_1.webp

   The editor pattern is:
   /tour-output/assets/manual-tiles/out-gate/{face}/{row}_{col}.webp

   This loads 6 files total.

4. If Grid per face = 2, each face contains:
   1_1.webp
   1_2.webp
   2_1.webp
   2_2.webp

   This loads 24 files total.

5. After files are placed, open the editor, set Image loading mode to
   "Manual tiles from file paths", fill the pattern, grid size, then click Save Configuration / Publish.
