async function gotonext() {
  downloadfile();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const nextbutton = document.querySelector("[name='next']");
  if (!nextbutton) {
    console.error("Next button not found!");
    return;
  }
  nextbutton.click();
}

function downloadfile() {
  const anchors = document.querySelectorAll("a");
  if (anchors.length < 2) {
    console.error("Download link not found!");
    return;
  }
  anchors[1].click();
  console.log("File download initiated.");
}

gotonext();
