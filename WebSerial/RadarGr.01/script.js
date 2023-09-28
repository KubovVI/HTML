let portOpen=false; let portRun=true; let holdPort=null; 
let portPromise; let port; let reader;
const termMaxSize=40000; 
let grOn=false; let gr; let grWidth; let grHeight;
let maxRange=8; //0-8
let maxAmp=100; 

function init(){
  if (!navigator.serial){ 
    _port_info.value="WebSerial is not supported"; 
    return false;
  }//if
  clearTerminal();
  // init Graph
  grWidth=_pic.width; grHeight=_pic.height;
  gr=_pic.getContext("2d");
  rStep=grWidth/(maxRange+1);
  aStep=grHeight/maxAmp;
  drawExample();
};//init

function openClose(){
  if (portOpen) portRun=false;
  else runPort();
}//openClose

async function runPort() {
  portPromise=new Promise((resolve) => {
    (async () => {
        port=await navigator.serial.requestPort();
        var baudSelected=parseInt(_baud_rate.value);
        await port.open({baudRate: baudSelected});
        const reader=port.readable.getReader(); 
        portOpen=true; 
        _openclose_port.innerText="Close";
        let portInfo=port.getInfo();
        _port_info.value="Connected"; 
 
        while (portRun) {const {value,done}=await reader.read();
          if (done) break;
          if (_term_window.value.length>termMaxSize) truncTerminal(termMaxSize/4); 
          _term_window.value+=deCode(value); 
          _term_window.scrollTop=_term_window.scrollHeight;
          if (grOn) grProcessing(value);
          //grProcessing(value);
        }//while

        reader.releaseLock();
        reader.cancel(); 
        await port.close();
        portOpen=false; portRun=true;
        _openclose_port.innerText="Open";
        _port_info.value="Disconnected";
        resolve();
      })();//async
    });//promise
  return;
}//runStop

const comPrefix= [0xFD,0xFC,0xFB,0xFA]; 
const comPostfix=[0x04,0x03,0x02,0x01]; 
const commands=[
   [0x04,0x00,0xFF,0x00,0x01,0x00], //0-enable Config
   [0x02,0x00,0xFE,0x00], //1-end Config
   [0x02,0x00,0x62,0x00], //2-set EngenMode
   [0x02,0x00,0x63,0x00], //3-set NormMode
   [0x02,0x00,0xA0,0x00], //4-get Version
   [0x04,0x00,0xA1,0x00,0x07,0x00], //5-256000bods
   [0x04,0x00,0xA1,0x00,0x05,0x00], //6-115200bods
   [0x02,0x00,0xA2,0x00], //7-Reset
   [0x04,0x00,0xA4,0x00,0x01,0x00], //8-Bluetooth On
   [0x04,0x00,0xA4,0x00,0x01,0x00], //9-Bluetooth Off
   [0x04,0x00,0xA5,0x00,0x01,0x00], //10-get MAC
   [0x02,0x00,0xA3,0x00], //11-Restart
   [0x02,0x00,0x61,0x00], //12-read Parameters
   [0x02,0x00,0xAB,0x00], //13-get Resolution
   [0x04,0x00,0xAA,0x00,0x00,0x00], //set Lo Resolution
   [0x04,0x00,0xAA,0x00,0x01,0x00], //set Hi Resolution
];

async function sendCommand() {
  let commandN=_command.value; if (commandN=="none") return;
  let commandFull=[].concat(comPrefix,commands[commandN],comPostfix);
  let command=new Uint8Array(commandFull);
  const writer = port.writable.getWriter();
  await writer.write(command);
  writer.releaseLock();
  _term_window.value+=hexCommand(command);
  _term_window.scrollTop=_term_window.scrollHeight;
}//sendCommand

function clearTerminal() {_term_window.value="";}

function truncTerminal(x) {
  _term_window.value=_term_window.value.substring(x);
}

let header=[0,0,0,0];

function deCode(v){
  let s=""; 
  for (var i=0; i<v.length; i++){
    const c=v[i]; 
    for (var j=1; j<4; j++) header[j-1]=header[j]; header[3]=c;
    s+=c.toString(16).padStart(2,'0')+" ";    
    //if (i<v.length-1) s+=" "; else s+="+";
    if ((header[0]==0xf8)&&(header[1]==0xf7)&&(header[2]==0xf6)&&(header[3]==0xf5)) s+="\n";
    if ((header[0]==0x04)&&(header[1]==0x03)&&(header[2]==0x02)&&(header[3]==0x01)) s+="\n";
  }//for i
  return s;
}//deCode

function hexCommand(v){
  let s="\n>"; 
  for (var i=0; i<v.length; i++){
    s+=v[i].toString(16).padStart(2,'0')+" ";
  }//for i
  s+="\n";
  return s;
}//hexCommand

function saveFile(){
  fName="R"+DateToStr()+".txt";	  
  data ="1234567890"; 
  tBlob=new Blob([_term_window.value],{type:"text/plain"});
  aLink=document.createElement("a");
  aLink.download=fName;
  aLink.href=window.URL.createObjectURL(tBlob);
  //aLink.style.display="none";
  document.body.appendChild(aLink);
  aLink.click(); 
}//saveFile

function DateToStr(){
  var Dt=new Date();
  yy=Dt.getFullYear(); 
  mn=decToStr2(Dt.getMonth()+1); dd=decToStr2(Dt.getDate()); 
  var s=""+yy+mn+dd; 
  hh=decToStr2(Dt.getHours()); mm=decToStr2(Dt.getMinutes()); 
  s+=hh+mm;
  return s;
}//DateToStr

function decToStr2(v) {return v.toString(10).padStart(2,"0")}

function grOnOff(){
  if (grOn) {
    grOn=false;
    _grOnOff.innerText="Graph"; _grW.style.visibility="hidden";
    _dataQ.innerText="*"; 
    return;
  }//
  grOn=true;
  _grOnOff.innerText="Terminal"; _grW.style.visibility="visible";
  _dataQ.innerText="_"; 
}//grOnOff

function clearGraph(){
  gr.fillStyle="#ffffff"; 
  gr.fillRect(0,0,grWidth,grHeight);
  gr.fillStyle="#c0c0ff";
  for (let i=1; i<=maxRange; i++) gr.fillRect(i*rStep,0,2,grHeight);  
  for (let i=10; i<100; i+=10){
    let w=1; if (i==50) w=3;
    gr.fillRect(0,i*aStep,grWidth,w);
  }//for i  
}//clearGraph

function drawAmpS(r,a){
  if (r>maxRange) return;
  gr.fillStyle="#ff0000"; 
  gr.fillRect(r*rStep,grHeight,rStep*0.45,-a*aStep);
}//drawAmpS

function drawAmpD(r,a){
  if (r>maxRange) return;
  gr.fillStyle="#0000ff"; 
  gr.fillRect((r+0.5)*rStep,grHeight,rStep*0.45,-a*aStep);
}//drawAmpD

function drawExample(){
  clearGraph();
  drawAmpS(0,90);
  drawAmpS(1,50);
  drawAmpS(2,1);
  drawAmpS(8,10);
  drawAmpD(0,100);
  drawAmpD(1,60);
  drawAmpD(2,10);
  drawAmpD(8,20);
}//drawExample

//const dataLength=45; const dataPrefix= [0xF4,0xF3,0xF2,0xF1,0x23,0x00,0x01,0xAA]; 
const dataLength=40; const dataPrefix= [0xF3,0xF2,0xF1,0x23,0x00,0x01,0xAA]; 
const offsetAmpD=18; const offsetAmpS=29;
const dataPostfix=[0xF8,0xF7,0xF6,0xF5];

function grProcessing(v){
  if (v.length<dataLength){ // check length
    _dataQ.innerText=String.fromCharCode(8195); //&emsp;
    return;
  }//if
  // check prefix 
  let i;
  for (i=0; i<dataPrefix.length; i++){ 
    if (v[i]!=dataPrefix[i]) break;
  }//for i
  if (i<dataPrefix.length){ 
    _dataQ.innerText=String.fromCharCode(8195); //&emsp;
    return;
  }//if
  // found prefix
  _dataQ.innerText="*";
 
clearGraph();
 for (i=0; i<=8; i++){
   drawAmpS(i,v[i+offsetAmpS]);
   drawAmpD(i,v[i+offsetAmpD]);  
}//for i
}//grProcessing