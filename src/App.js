import React from 'react';
import { Grid, Typography, Button, Dialog, DialogContent, CircularProgress } from '@material-ui/core'
import MapList from './components/MapList';
import arweave from './arweave';


class App extends React.Component{
  state = {
    wallet:false,
    address:false,
    winston:false,
    ar:false,
    loading:false,

  }

  loadFile = (data) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {resolve(reader.result)}, false)
      reader.readAsText(data)
    })
  }

  openFileReader = () => document.getElementById('filereader').click()

  loadData = async(e) => {
    try{
      this.setState({ loading:true })
      const file = await this.loadFile(e.target.files[0])
      const wallet = await JSON.parse(file)
      const address = await arweave.wallets.jwkToAddress(wallet)
      const winston =  await arweave.wallets.getBalance(address)
      const ar = await arweave.ar.winstonToAr(winston)
      this.setState({ wallet, address, winston, ar, loading: false })
    }catch(err){
      console.log(err)
      this.setState({ loading: false })
      alert('Error')
      return
    }
  }

  render(){
    const{ wallet, ar, address } = this.state
    return(
      <Grid container direction="column" justify="center" alignContent="center" style={{backgroundColor:'#dfe6e9'}}>
      <Typography align="center" variant="h6">Eternal Place</Typography>
       {wallet ?
          <Grid container direction="column">
            <Typography align="center" style={{fontWeight:700}}>User Arweave Address:</Typography>
            <Typography  align="center">{address}</Typography>
            <Typography  align="center">{ar} AR</Typography>
          </Grid>
          :
            <Button variant="extendedFab" style={{fontSize:10, textTransform:'none', maxWidth:150, margin:10}} onClick={this.openFileReader} color="primary">Load Arweave Wallet</Button>
        }
          <input type="file" onChange={(e) => this.loadData(e)} id="filereader" style={{display: "none"}}/>
          <Dialog open={this.state.loading}><DialogContent><CircularProgress/></DialogContent></Dialog> 
        <MapList wallet={wallet} />
      </Grid>
    )
  }
}

export default App;
