import React, { Component } from 'react';
import axios from 'axios'
import uuidv4 from 'uuid/v4'

// component
import Message from './Message'
import WriteMessage from './WriteMessage'
import Loading from '../Loading'

// Constants
import Constants from '../Constants'

class MessagesPanel extends Component {
  // static propTypes = {
  //   className: PropTypes.string,
  // };

  constructor(props) {
    super(props);

    this.state = {
      messages: [],
      showLoading: true
    }

    // instantiate the Constants
    this.allConstants = new Constants()
  }

  // when the component is mounted 
  componentDidMount() {
    console.log('did mount control comes here.. after new message enters')

    this.scrollToBottom()
  }

  // when the component is updated
  componentDidUpdate() {
    console.log('DID updated control comes here.. after new message enters')
    this.scrollToBottom()
  }

  scrollToBottom() {
    this.messageEnd.scrollIntoView({ behavior: 'smooth' });
  }
  // load the messages when the nextProps is different from the present one
  // most important don't forget it 
  componentWillReceiveProps(nextProps) {
    if (nextProps.selectedRoomId !== this.props.selectedRoomId)
      this.loadConversation(nextProps.selectedRoomId)
  }

  // load the conversation of the selected friend
  loadConversation(id) {
    let allConstants = this.allConstants
    let selectedRoomId = (id) ? id : 'anijit123-sam432' // this.props.selectedRoomId ||

    console.log('IN MESSAGE PANEL : selected friend id in ', selectedRoomId)

    axios({
      method: allConstants.method.GET,
      url: allConstants.getConversation.replace('{id}', selectedRoomId),
      header: allConstants.header
    })
      .then((res) => {
        console.log('conversation is now: ', res.data)

        // set the messages field of the state with the data
        this.setState({ messages: res.data, showLoading: false })
      })
  }

  onNewMessageArrival(data) {

    let newMessages = [...this.state.messages]
    console.log('New Messages are', newMessages)

    // if the current message is from the selected room also
    if (data.roomId == this.props.selectedRoomId) {
      this.setState((prevState, props) => ({
        messages: [...this.state.messages, { ...data }]
      }))
    }

    // fill the Room info from Socket data
    this.props.fillRoomInfoFromSocket(data)
  }

  render() {
    let { messages, showLoading } = this.state
    let { userInfo, selectedRoomId } = this.props

    return (

      <div className="message-panel">
        <div className="show-messages">
          {(showLoading == true) ? <Loading />
            :
            messages.map((message) => {
              return <Message key={message.id} {...message} userInfo={userInfo} />
            })
          }
          <div style={{ float: "left", clear: "both" }} ref={(el) => { this.messageEnd = el; }}></div>
        </div>
        <WriteMessage
          isDisabled={showLoading}
          userInfo={userInfo}
          selectedRoomId={selectedRoomId}
          onNewMessageArrival={this.onNewMessageArrival.bind(this)} />

      </div>

    );
  }
}

export default MessagesPanel;