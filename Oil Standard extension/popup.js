function openInNewTab(url) {
  var win = window.open(url, '_blank');
  win.focus();

}
function main(){
document.body.style.width = ""+100;
document.body.style.height = ""+100;
document.getElementById("prices").innerHTML = "Oil Barrel Price: "

chrome.storage.sync.get('barrelprice', function(result){	document.getElementById("prices").innerHTML = document.getElementById("prices").innerHTML+result.barrelprice});
}

main();
