/*indexList 知乎日报*/
'use strict';
import React, {
  Component,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableHighlight,
  WebView,
  Image,
  ListView,
  NetInfo
} from 'react-native';
import until from './common/until.js'
import share from './common/share.js'
import MTListview from './common/MTListview.js'

var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
class Zhihu extends Component{
  constructor(props){
    super(props);
    this.data = {list:[],date:''};
    this.state = {
      loading:false,
      ajaxing:false,
      dataSource: ds.cloneWithRows(this.data.list),
      tipText:'',
      tipShow:false,
      isDataNull:false
    }
    this.getNetWork();
  }
  getNetWork(){
    var self = this;
    NetInfo.isConnected.fetch().done((isConnected)=> {
       if(!isConnected){
         //从缓存读取
         storage.load({key:'zhihuList'}).then(ret =>{
           self.data = ret.newslist;
            setTimeout(()=>{
               self.setState({
                 loading:false,
                 ajaxing:false,
                 dataSource: ds.cloneWithRows(self.data)
               });
            })
          }).catch( err => {
              //网络错误 并且无缓存
              self.setState({
                isDataNull:true
              })
          });
       }else{
         self.getData();
       }
    })
  }
  getData(callback){
    var news = [],
        cbk  = callback || function(){},
        url = this.state.date ? 'http://news.at.zhihu.com/api/4/news/before/'+this.state.date : 'http://news-at.zhihu.com/api/4/news/latest';
    until.ajax({
      url:url,
      success:(data)=>{
        data.stories.map((item)=>{
          item['date'] = data.date;
        })
        this.data.list = this.data.list.concat(data.stories);
        this.setState({
          loading:true,
          ajaxing:false,
          date:data.date,
          dataSource: ds.cloneWithRows(this.data.list)
        });
        this.dataHandle = setTimeout(()=>{
          cbk();
        },100);
        //设置第一页缓存
        if(!this.state.date){
          storage.save({
            key: 'zhihuList',
            rawData:data,
            expires:null
          });
        }
      },
      failure:(data)=>{
        this.setState({
          loading:true,
          ajaxing:false,
        });
        alert('失败')
      }
    })
  }
  loadPage(id,type,title,imgUrl,flag) {
    var self = this;
    var url = 'http://daily.zhihu.com/story/'+id;
    var data = {
      component:Detail,
      title:'',
      rightButtonTitle:'分享',
      passProps:{
        id:id,
        type:type,
        tipText:this.state.tipText,
        tipShow:this.state.tipShow
      },
      onRightButtonPress:function(){
        //that.props.navigator.pop();
        share.show({
          type:'news',
          title:title,
          description:'来自那个码农的资讯APP',
          imageUrl:imgUrl,
          webpageUrl:url,
        },'知乎',url,title,(txt)=>{
              self.setState({
                tipText:txt,
                tipShow:true
              });
              self.loadPage(id,type,title,imgUrl,true);
              setTimeout(()=>{
                self.setState({
                  tipText:txt,
                  tipShow:false
                });
                self.loadPage(id,type,title,imgUrl,true);
              },1000)
        });
      }
    }
    flag ? this.props.navigator.replace(data):this.props.navigator.push(data)

  }

  renderRow(result,sid,rid) {
    var pic = result.images[0];
    return (
      <TouchableHighlight underlayColor="#eee" onPress={this.loadPage.bind(this,result.id,result.type,result.title,pic,false)}>
          <View style={[styles.ListItem,rid%2 ? styles.bgOdd:'']} ref={result.id}>
            <Image style={styles.listImage} source={{uri:pic}} resizeModle="cover"/>
            <Text numberOfLines={3} style={[styles.listTitle]}>{result.title}</Text>
            <Text style={[styles.listItemDate]}>{result.date}</Text>
          </View>
      </TouchableHighlight>
    )
  }
  nextPage(){ 
    if(this.state.ajaxing) return;
    if(this.state.date=='20151231'){
      this.setState({
        loadedAll:true
      });
    }else{
      this.state.page++;
      this.setState({
        ajaxing:true
      })

      this.getData();
    }
  }

  onRefreshData(callback){
    
    this.data = {
      list:[]
    }
    this.setState({
      loadedAll:false,
      date:''
    })
    this.getData(callback);
  }


  renderFooter(){
    if(this.state.loadedAll){
      return <Text style={[styles.loadedAll,styles.gray]}>你下面没了...</Text>
    }
    if(this.state.ajaxing){
      return until.LoadMoreTip
    }
  }
  retry(){
    this.getNetWork();
  }
  render(){ 
    if(this.state.isDataNull){
      //无网络并且无缓存数据
      return (
        <View style={[styles.flex,styles.center]}>
          <Text style={[styles.gray]}>无网络。。。</Text>
          <TouchableHighlight onPress={this.retry.bind(this)} style={[styles.button]}>
            <Text></Text>
          </TouchableHighlight>
        </View>
      )
    }
    return (
      <View style={[styles.flex,styles.listviewWrap]}>
        {
          this.state.loading ? <MTListview 
            dataSource={this.state.dataSource} 
            renderRow={this.renderRow.bind(this)}
            renderHeader = {(txt,currentState)=>{return until.pullHeaderRefresh(txt,currentState)}}
            headerLoadingHeight = {50}
            refreshable={true}
            renderFooter = {this.renderFooter.bind(this)}
            onRefreshData={(cbk)=>{this.onRefreshData(cbk)}}
            onEndReached={this.nextPage.bind(this)}
            >
          </MTListview> : until.Loading
        }
      </View>
    )
  }
}
 
/*文章详情页*/
class Detail extends Component{
  constructor(props){
    super(props)
    this.state = {
      url:'',
      body:'',
      image:'',
      css:''
    }
  }
  getData(){
    var id   = this.props.id,
        type = this.props.type;
    var url  = 'http://news-at.zhihu.com/api/4/news/'+id;
    if(type==0){
      until.ajax({
        url:url,
        success:(data)=>{
          this.setState({
            url:data.share_url,
            body:data.body,
            image:data.image,
            css:data.css[0]
          })
        }
      })
    }
  }

  componentWillMount(){
    this.getData();
  }
  render(){
    //console.log(this.refs.nav)
    var headImg = '<img src="'+this.state.image+'" width="100%"/>'
    var htmls = this.state.body.replace('<div class="img-place-holder"></div>',headImg)+'<link href="'+this.state.css+'" rel="stylesheet"/>'
    var config = this.props.type==0 ? {html:htmls}:{uri:this.state.url}
    return (
      <ScrollView style={[styles.webviewWrap]}>
        <WebView  ref="webview"  automaticallyAdjustContentInsets={false}
          style={styles.articleWebview}
          contentInset={{top:0,bottom:47}}
          source={config} />
          {this.props.tipShow ? until.Tip(this.props.tipText):null}
      </ScrollView>
    )
  }
}




const styles = StyleSheet.create({
  modal:{
    flex: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0
  },
  bgOdd:{
    backgroundColor:'#f7f7f7'
  },
  center:{
    justifyContent:'center',
    alignItems:'center'
  },
  listviewWrap:{
    marginBottom:50,
  },
  ListItem:{
    flex:1,
    flexDirection:'row',
    paddingTop:15,
    paddingBottom:10,
    borderBottomWidth:1/until.pixel,
    borderBottomColor:'#fff',
    
  },
  listImage:{
    width:60,
    height:60,
    marginLeft:5,
    justifyContent:'center',
    flex:1
  },
  listTitle:{
    fontSize:15,
    color:'#333',
    paddingLeft:5,
    paddingRight:5,
    lineHeight:20,
    flex:3
  },
  
  listItemDate:{
    textAlign:'center',
    fontSize:12,
    height:20,
    lineHeight:16,
    paddingLeft:4,
    paddingRight:4,
    backgroundColor:'#eee',
    color:'#999',
    position:'absolute',
    right:10,
    bottom:10
  },
  Detail:{
    backgroundColor:'red',
    flexDirection:'row'
  },
  webviewWrap:{
    flex:1,
    height:until.size.height
  },
  articleWebview:{
    height:until.size.height
  },
  webviewImage:{
    width:until.size.width,
    height:100
  },
  loadedAll:{
    textAlign:'center',
    fontSize:13
  },
  flex:{
    flex:1
  },
  width:{
    width:until.size.width
  },
  gray:{
    color:'#a8a8a8'
  },
  ml5:{
    marginLeft:5
  },

  transparent:{
    backgroundColor:'transparent'
  }
});



export default Zhihu;