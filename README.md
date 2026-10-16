# Set the Clock

A drag-the-hands clock game (720 x 540) built with HTML, CSS and JavaScript,
made to be inserted into Articulate Storyline 360 as a Web Object.

## Play it locally

Double-click `index.html`.

## How it works

- Start screen: white background, 300px start button.
- 10 random questions. Two questions in a row never share an hour, and two
  "o'clock" questions never come back to back.
- Audio: "Set the clock to" + hour + minutes, or "Set the clock to" + "N o'clock".
- The speaker button (top left) replays the question.
- Drag either hand. The other hand follows, like a real analog clock. On release
  the time snaps to the nearest 5 minutes and is checked automatically.
- 11 o'clock is never asked because there is no "11 o'clock" recording.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page structure |
| `style.css` | Layout and look |
| `script.js` | Game logic (dragging, questions, audio) |
| `assets/images` | Background (hands removed), hand cutouts, centre cap, start button |
| `assets/audio` | The provided voice clips, renamed without spaces |
| `assets/fonts` | DSEG7 LED font for the digital display |

## Putting it in Storyline 360

1. Create a new project. Set the slide size to 720 x 540 (Design > Slide Size).
2. Insert > Web Object, then choose this `clock-game` folder (the one containing `index.html`).
3. Set Display to "Display in slide", then click OK.
4. Resize the web object to exactly 720 x 540 and place it at X 0, Y 0.
5. Publish > Review 360, then copy the link it gives you.

Web Objects only run in published output, not in Storyline's Preview.
