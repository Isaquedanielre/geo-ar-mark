import React, { Component, Fragment } from 'react'
import { Map, TileLayer, Marker, Popup, LayersControl, Tooltip } from 'react-leaflet'
import "./css/default.css";
// import { BingLayer } from "react-leaflet-bing";
import { Lightbox } from "react-modal-image";
import { Grid, Dialog, DialogContent, Typography, InputBase, Button, CircularProgress } from '@material-ui/core';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css'; // Re-uses images from ~leaflet package
import 'leaflet-defaulticon-compatibility';
import arweave from '../arweave';
const { BaseLayer } = LayersControl;
 

const getListHistory = async() => {
  try{
    const query = {
      op: 'and',
      expr1: {
          op: 'equals',
          expr1: 'App-Name',
          expr2: 'geohistory-demo'
      },
      expr2:{
          op: 'equals',
          expr1: 'object',
          expr2: 'mark'
        }
    }      
    let data = []
    const list = await arweave.arql(query);
    if(list.length === 0){
      return []
    }else{
      list.map(txId => data.push(getTxData(txId)))
      const resultData = await Promise.all(data)
      console.log(resultData)
      return resultData
    }
  }catch(err){
    console.log(err)
    return err
  }
}

const getTxData = async(txId) => {
  return new Promise(async function(resolve, reject){
    try{
      const tx = await arweave.transactions.get(txId)
      let data = await JSON.parse( tx.get('data', {decode: true, string: true}) )
      resolve(data)
    }catch(err){
      resolve({error:true, err})
    }
  })
}



const MyPopupMarker = ({ coordinates, img, description, openImg }) => {
  if(!img) return null
  return(
  <Marker position={coordinates}>
    <Popup>
      <Typography>{description}</Typography>
      <img onClick={() => openImg(img)} src={img} alt='img' style={{maxWidth:180, maxHeight:180}}/>
    </Popup>
  </Marker>
)}

const MyMarkersList = ({ markers, openImg }) => {
  const items = markers.map(({ key, ...props }) => (
    <MyPopupMarker openImg={openImg} key={key} {...props} />
  ))
  return <Fragment>{items}</Fragment>
}

const ReadImage = async (fileInput) => {
  const readAsDataURL = (fileInput) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => {
        reader.abort();
        reject(new Error("Error reading file."));
      };
      reader.addEventListener("load", () => {
        
        resolve(reader.result);
      }, false);
      reader.readAsDataURL(fileInput);
    });
  };      
  const valid = await isFileImage(fileInput)
  console.log(valid)
  if(valid){
    return readAsDataURL(fileInput)
  }else{
    return null
  }
}

const isFileImage = (file) => {
  return file && file['type'].split('/')[0] === 'image';
}


export default class MapList extends Component {
  state = {
    markers: [],
    mark:false,
    openCreateHistoryModal:false,
    imgHistory:'',
    descriptionHistory:'',

    transactionData:false,
    transactionFeeAr:false,
    transactionFeeWinston:false,
    confirmTx:false,

    openImg:false,
    img:false,
    loading:false
  }

  async componentDidMount(){
    try{
      const data = await getListHistory()
      this.setState({ markers: data })
    }catch(err){
      console.log(err)
      return err
    }
  }

  closeLightbox = () => this.setState({ openImg: false})

  setImg = (img) => {
    this.setState({img, openImg:true})
  }


  addMarker = (e) => {
    this.setState({mark:e.latlng})
  }

  openPopup (marker) {
    if (marker && marker.leafletElement) {
      window.setTimeout(() => {
        marker.leafletElement.openPopup()
      })
    }
  }
  loadImage = async(e) => {
    try{
      this.setState({loading:true})
      const imgData = await ReadImage(e.target.files[0])
      this.setState({imgHistory: imgData, loading: false})
    }catch(err){
      console.log(err)
      this.setState({ loading: false })
      return err
    }
  }

  openCreateHistory = async() => {
    try{
      this.setState({openCreateHistoryModal:true})
    }catch(err){
      console.log(err)
      return err
    }
  }

  createHistoryTransaction = async() => {
    try{
      if(!this.props.wallet){
        alert('No Wallet Loaded')
        return
      }
      const data = JSON.stringify({
        coordinates: this.state.mark,
        img: this.state.imgHistory,
        description: this.state.descriptionHistory
      })
      let transaction = await arweave.createTransaction({
        data
    }, this.props.wallet);
    transaction.addTag('App-Name', 'geohistory-demo');
    transaction.addTag('object', 'mark');
    const txFee = await arweave.ar.winstonToAr(transaction.reward)
    this.setState({confirmTx:true, transactionData:transaction, transactionFeeAr:txFee, transactionFeeWinston:transaction.reward})
    }catch(err){
      console.log(err)
      return err
    }
  }

  confirmCreateHistory = async() => {
    try{
      this.setState({loading:true})
      const transaction = this.state.transactionData
      const fee = parseInt(transaction.reward)
      const address = await arweave.wallets.jwkToAddress(this.props.wallet)
      const userBalance = await arweave.wallets.getBalance(address)
      if(fee>parseInt(userBalance)){
        alert('Insuficient Balance')
        this.setState({loading:false})
        return
      }
      await arweave.transactions.sign(transaction, this.props.wallet)
      await arweave.transactions.post(transaction)
      this.setState({ 
        mark:false,
        openCreateHistoryModal:false,
        imgHistory:'',
        descriptionHistory:'',
        loading:false,
        transactionData:false,
        transactionFeeAr:false,
        transactionFeeWinston:false,
        confirmTx:false,    
        openImg:false,
        img:false})
        alert('Your memory has been send to the eternity of cyberspace')
    }catch(err){
      console.log(err)
      this.setState({loading:false})
      return err
    }
  }


  render() {
    return (
        <div>
        <Grid style={{ width:" 90vw", height: 500, padding: 10 }}>
          <Map onClick={this.addMarker} className="map" center={[51.505, -0.09]} zoom={1}>
            <LayersControl>
                {/* <BaseLayer name="Satelite">
                  <BingLayer bingkey={bing_key} type="Aerial" />
                </BaseLayer> */}
                <BaseLayer checked name="Map">
                  <TileLayer
                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
                  />
                </BaseLayer>
                </LayersControl>
                <MyMarkersList openImg={this.setImg} markers={this.state.markers} />
                {this.state.mark && 
                  <Marker onClick={this.openCreateHistory}  position={this.state.mark} ref={this.openPopup}>
                  <Tooltip permanent>
                    <span>Click in the marker to create a new history</span>
                  </Tooltip>
                </Marker>
                }
          </Map>
        </Grid>
       {this.state.openImg &&
        <Lightbox
          small={this.state.img}
          large={this.state.img}
          onClose={this.closeLightbox}
        />}


        <Dialog open={this.state.openCreateHistoryModal} onClose={() => this.setState({openCreateHistoryModal:false, imgHistory:false, descriptionHistory:false})}>
          <DialogContent>
            <Grid container direction="column">
            {/*            
                <Typography>Titulo</Typography>
                <InputBase onChange={(e) => this.setState({titleHistory:e.target.value})} value={this.state.titleHistory} style={{backgroundColor:'#dfe6e9', borderRadius:10}} /> */}
                <Typography style={{paddingTop:10}}>Descricao</Typography>
                <InputBase onChange={(e) => this.setState({descriptionHistory:e.target.value})} value={this.state.descriptionHistory} multiline rows={5} style={{backgroundColor:'#dfe6e9', borderRadius:10}} />
                <Grid container style={{padding:10}} justify="center" direction="column" alignContent="center" alignItems="center">
                {this.state.imgHistory ? 
                  <React.Fragment>
                    <img src={this.state.imgHistory} style={{maxWidth:180, maxHeight:180}}/>
                    <label align="center" onClick={() => this.setState({imgHistory:false})} style={{padding:5,margin:5, backgroundColor:'#ff7675', color:'white',fontSize:10, borderRadius:10, maxWidth:100}} >
                      X - Remove Image
                    </label>
                  </React.Fragment>
                  :
                  <React.Fragment>
                    <label align="center" style={{padding:10, backgroundColor:'#74b9ff', color:'white', borderRadius:10, maxWidth:130}} for="upload-img">
                      Load Image
                    </label>
                    <input type="file" accept="image/*" onChange={ e => this.loadImage(e)} id="upload-img" style={{display: "none"}}/>          
                  </React.Fragment>
                }
                </Grid>
                {this.state.confirmTx ? 
                  <React.Fragment>
                    <Typography>Fee: {this.state.transactionFeeAr}</Typography>
                    <Button style={{color:'white', backgroundColor:'green'}} onClick={this.confirmCreateHistory} variant="contained">Confirm</Button>
                  </React.Fragment>
                  :
                  <Button style={{color:'white', backgroundColor:'green'}} onClick={this.createHistoryTransaction} variant="contained">Advance</Button>
                }
            </Grid>
            <Dialog open={this.state.loading}><DialogContent><CircularProgress/></DialogContent></Dialog> 
          </DialogContent>
        </Dialog>
      </div>
    )
  }
}