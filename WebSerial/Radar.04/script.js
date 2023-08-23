let portOpen=false; let portRun=true; let holdPort=null; 
let portPromise; let port; let reader;
const termMaxSize=40000; 

function init(){
  if (!navigator.serial){ 
    _port_info.value="WebSerial is not supported"; 
    return false;
  }//if
  clearTerminal();
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
