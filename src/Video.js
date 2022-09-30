import { Grid, Paper } from "@mui/material";

export default function Video(props) {
    return (
        <Grid container style={{width: '100%', margin: '0 auto'}}>
        <Grid item xs={12}>
          <Paper style={{height: 100, margin: 10}}></Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper style={{height: 100, margin: 10}}></Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper style={{height: 100, margin: 10}}></Paper>
        </Grid>
      </Grid>
    );
  }