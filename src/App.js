import React from 'react';
import { Lightbox } from "react-modal-image";
import { Grid, Typography, Button, Dialog, DialogContent, CircularProgress, Paper } from '@material-ui/core'
import MapList from './components/MapList';
import arweave from './arweave';
import { Map, TileLayer, Marker, LayersControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css'; // Re-uses images from ~leaflet package
import 'leaflet-defaulticon-compatibility';
const { BaseLayer } = LayersControl;

const getUserListHistory = async(userAddress) => {
  try{
    // const query = {
    //   op: 'and',
    //   expr1: {
    //       op: 'equals',
    //       expr1: 'App-Name',
    //       expr2: 'geohistory-demo'
    //   },
    //   expr2:{
    //   op: 'equals',
    //     expr1: 'object',
    //     expr2: 'mark'
    //     }
    //}    
    const query = {

    op: "and",
    expr1: {
      op: "equals",
      expr1: "from",
      expr2: userAddress
    },
    expr2: {
      op: "and",
      expr1: {
        op: 'equals',
        expr1: 'App-Name',
        expr2: 'geohistory-demo'
      },
      expr2: {
        op: 'equals',
        expr1: 'object',
        expr2: 'mark'
      }
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

const PropertyBox = (props) => {
  const {
    coordinates, img, description
  } = props.data;
  if(!coordinates || !img || (img.length === 0)){
    return null
  }
  return (
    <Paper
      style={{
        width: 300,
        maxHeight: 400,
        padding: 10,
        borderRadius: 5,
        margin: '30px 10px 0'
      }}
    >
      <Grid container align="center" justify="center" alignContent="center" alignItems="center" direction="column">
        <img onClick={() => props.openImg(img)} src={img} alt='img' style={{maxWidth:180, maxHeight:180}}/>
        <Typography>{description}</Typography>        
        <Map className="map" center={coordinates} zoom={8}>
            <LayersControl>
                <BaseLayer checked name="Map">
                  <TileLayer
                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
                  />
                </BaseLayer>
                </LayersControl>
                <Marker position={coordinates}>
                </Marker>
          </Map>
          <Button  variant="extendedFab" style={{fontSize:11, textTransform:'none', maxWidth:150, margin:10, backgroundColor: 'green', color: 'white'}} onClick={() => props.setCenterMap(coordinates)}>Check on Map ></Button>
      </Grid>
    </Paper>
  );
};

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


class App extends React.Component{
  state = {
    wallet:false,
    address:false,
    winston:false,
    ar:false,
    loading:false,
    userHistory:[],
    userHistoryShow:false,
    openImg:false,
    img:false,
    
    centerMain: [51.505, -0.09],
    zoomMap:2

  }

  loadFile = (data) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {resolve(reader.result)}, false)
      reader.readAsText(data)
    })
  }

  setCenterMap = (coords) => this.setState({ centerMain: coords, zoomMap: 18, userHistoryShow: false })


  openFileReader = () => document.getElementById('filereader').click()

  loadData = async(e) => {
    try{
      this.setState({ loading:true })
      const file = await this.loadFile(e.target.files[0])
      const wallet = await JSON.parse(file)
      const address = await arweave.wallets.jwkToAddress(wallet)
      const winston =  await arweave.wallets.getBalance(address)
      const ar = await arweave.ar.winstonToAr(winston)
      const userHistory = await getUserListHistory(address)
      this.setState({ wallet, address, winston, ar, userHistory, loading: false })
    }catch(err){
      console.log(err)
      this.setState({ loading: false })
      alert('Error')
      return
    }
  }

  setImg = (img) => {
    this.setState({img, openImg:true})
  }

  closeLightbox = () => this.setState({ openImg: false})

  userHistoryClose = () => this.setState({userHistoryShow:false})

  render(){
    const{ wallet, ar, address } = this.state
    return(
      <Grid container direction="column" justify="center" alignContent="center" style={{backgroundColor:'#dfe6e9'}}>
      <Typography align="center" variant="h6">Eternal Place</Typography>
       {wallet ?
          <Grid container direction="column" justify="center" alignContent="center" alignItems="center">
            <Typography align="center" style={{fontWeight:700}}>User Arweave Address:</Typography>
            <Typography  align="center">{address}</Typography>
            <Typography  align="center">{ar} AR</Typography>
            <Button onClick={() => this.setState({userHistoryShow:true})} variant="extendedFab" style={{fontSize:10, textTransform:'none', maxWidth:150, margin:10}}>My Marks</Button>
          </Grid>
          :
            <Button variant="extendedFab" style={{fontSize:10, textTransform:'none', maxWidth:150, margin:10}} onClick={this.openFileReader} color="primary">Load Arweave Wallet</Button>
        }
          <input type="file" onChange={(e) => this.loadData(e)} id="filereader" style={{display: "none"}}/>
          <Dialog open={this.state.loading}><DialogContent><CircularProgress/></DialogContent></Dialog> 
          <Dialog open={this.state.userHistoryShow} onClose={this.userHistoryClose}><DialogContent style={{backgroundColor:'#b2bec3'}}>
            <Typography align="center" variant="h6">My Marks</Typography>
            {(this.state.userHistory.length === 0) && <Typography align='center'>You not store any mark</Typography>}
            {this.state.userHistory.map((item) => (
              <PropertyBox data={item} openImg={this.setImg} setCenterMap={this.setCenterMap} />
            ))}
              {this.state.openImg &&
              <Lightbox
                small={this.state.img}
                large={this.state.img}
                onClose={this.closeLightbox}
        />}
          </DialogContent></Dialog> 
        <MapList zoomMap={this.state.zoomMap} centerMap={this.state.centerMain} wallet={wallet} />
   
      </Grid>
    )
  }
}

export default App;
