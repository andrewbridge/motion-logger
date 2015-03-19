/**
 * Created by Andrew on 18/03/2015.
 */

function createGraphsFromInput() {
    var data = JSON.parse(document.getElementById("jsonsrc-bulk").value);
    var tooltips = JSON.parse(document.getElementById("jsonsrc-bulktips").value);
    for (var i = 0; i < data.oBeta.length; i++) {
        document.getElementById("jsonsrc-orientX").value = JSON.stringify(data.oBeta[i]);
        document.getElementById("jsonsrc-orientY").value = JSON.stringify(data.oGamma[i]);
        document.getElementById("jsonsrc-accelZY").value = JSON.stringify(data.aZY[i]);
        document.getElementById("jsonsrc-orientX-tooltip").value = JSON.stringify(tooltips.oBeta[i]);
        document.getElementById("jsonsrc-orientY-tooltip").value = JSON.stringify(tooltips.oGamma[i]);
        document.getElementById("jsonsrc-accelZY-tooltip").value = JSON.stringify(tooltips.aZY[i]);
        createGraphFromInput();
    }
}

function createGraphFromInput() {
    var data = {}, tooltip = {};
    data["orientX"] = document.getElementById("jsonsrc-orientX").value;
    data["orientY"] = document.getElementById("jsonsrc-orientY").value;
    data["accelZY"] = document.getElementById("jsonsrc-accelZY").value;
    tooltip["orientX"] = document.getElementById("jsonsrc-orientX-tooltip").value;
    tooltip["orientY"] = document.getElementById("jsonsrc-orientY-tooltip").value;
    tooltip["accelZY"] = document.getElementById("jsonsrc-accelZY-tooltip").value;
    var tab = document.querySelector("div[id^=\"tab\"]:not([data-populated=\"true\"]).simpleTabsContent");
    for (var datNom in data) {
        var div = tab.querySelector("."+datNom);
        div.id = tab.id+"-"+datNom;
        createGraph(div.id, JSON.parse(data[datNom]), JSON.parse(tooltip[datNom]));
    }
    tab.setAttribute("data-populated", "true");
    document.querySelector(".simpleTabsContent.currentTab").classList.remove("currentTab");
    document.querySelector(".simpleTabsNavigation .current").classList.remove("current");
    tab.classList.add("currentTab");
    document.getElementById(tab.id.replace("div", "a")).classList.add("current");
}

function createGraph(elmSel, data, tooltip) {
    var myChart = new JSChart(elmSel, 'line');
    myChart.setDataArray(data);
    myChart.setSize(document.body.getBoundingClientRect().width-40, 400);
    myChart.setLineSpeed(100);
    myChart.setLineColor('#8D9386');
    myChart.setLineWidth(4);
    myChart.setTitleColor('#7D7D7D');
    myChart.setAxisColor('#9F0505');
    myChart.setGridColor('#a4a4a4');
    myChart.setAxisValuesNumberX(9);
    myChart.setAxisValuesColor('#333639');
    myChart.setAxisNameColor('#333639');
    myChart.setTextPaddingLeft(0);
    tooltip = (tooltip[0] instanceof Array) ? tooltip : [tooltip];
    for (var tip of tooltip) {
        myChart.setTooltip(tip);
    }
    myChart.draw();
}

document.getElementById("jsonSubmit").addEventListener("click", createGraphFromInput, false);
document.getElementById("jsonBulkSubmit").addEventListener("click", createGraphsFromInput, false);

var stickyElements = document.getElementsByClassName('simpleTabsNavigation');

for (var i = stickyElements.length - 1; i >= 0; i--) {
    Stickyfill.add(stickyElements[i]);
}