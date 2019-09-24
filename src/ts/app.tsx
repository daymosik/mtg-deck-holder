import { authActions, AuthActions, AuthState, initialAuthState } from '@auth'
import '@firebase-config'
import { MagicSet } from '@models/magic'
import AdminView, { adminActions, AdminActions, AdminState, initialAdminState } from '@modules/admin/admin'
import {
  addCardFormActions, AddCardFormActions, AddCardFormState, initialAddCardFormState,
} from '@modules/card-collection/add-card-form'
import CardCollectionView, {
  cardCollectionActions, CardCollectionActions, CardCollectionState, initialCardCollectionState,
} from '@modules/card-collection/card-collection'
import CardDatabaseView, {
  cardDatabaseActions, CardDatabaseActions, CardDatabaseState, initialCardDatabaseState,
} from '@modules/card-database/card-database'
import SetView, {
  cardSetActions, CardSetActions, CardSetState, initialCardSetState,
} from '@modules/card-database/set'
import CardView, { cardActions, CardActions, CardState, initialCardState } from '@modules/card/card'
import LoginView, { initialLoginState, LoginActions, loginActions, LoginState } from '@modules/login/login'
import SignupView, { initialSignupState, signupActions, SignupActions, SignupState } from '@modules/signup/signup'
import CardDatabaseService from '@services/card-database'
import {
  LocationActions,
  locationActions,
  LocationState,
  parseLocation,
  Route,
} from '@services/location'
import FooterView from '@slices/footer'
import NavigationView, {
  initialNavigationState, NavigationActions, navigationAgtions, NavigationPath, NavigationState,
} from '@slices/navigation'
import LazyLoad from '@utils/lazy-load'
import firebase = require('firebase/app')
import 'firebase/auth'
import { app, h } from 'hyperapp'
import '../assets/styles/app.scss'
import ProtectedRoute from './components/protected-route'

export interface AppState {
  location: LocationState,
  auth: AuthState
  nav: NavigationState
  login: LoginState
  signup: SignupState
  cardDatabase: CardDatabaseState
  cardSet: CardSetState,
  card: CardState,
  cardForm: AddCardFormState,
  cardCollection: CardCollectionState,
  admin: AdminState,
}

const initialState: AppState = {
  location: parseLocation(),
  auth: initialAuthState,
  nav: initialNavigationState,
  login: initialLoginState,
  signup: initialSignupState,
  cardDatabase: initialCardDatabaseState,
  cardSet: initialCardSetState,
  card: initialCardState,
  cardForm: initialAddCardFormState,
  cardCollection: initialCardCollectionState,
  admin: initialAdminState,
}

export interface AppActions {
  location: LocationActions
  auth: AuthActions,
  nav: NavigationActions,
  login: LoginActions,
  signup: SignupActions
  cardDatabase: CardDatabaseActions,
  cardSet: CardSetActions,
  card: CardActions,
  cardForm: AddCardFormActions,
  cardCollection: CardCollectionActions,
  admin: AdminActions,
}

export const appActions: AppActions = {
  location: locationActions,
  auth: authActions,
  nav: navigationAgtions,
  login: loginActions,
  signup: signupActions,
  cardDatabase: cardDatabaseActions,
  cardSet: cardSetActions,
  card: cardActions,
  cardForm: addCardFormActions,
  cardCollection: cardCollectionActions,
  admin: adminActions,
}

const Home = () => <div class="container">Home</div>

const view = (state: AppState) => {
  return (
    <div class="wrapper" oncreate={LazyLoad.startLazyLoad}>
      <NavigationView {...state}/>
      <Route {...state} path={NavigationPath.Home} render={Home}/>
      <Route {...state} path={NavigationPath.Login} render={LoginView}/>
      <Route {...state} path={NavigationPath.Signup} render={SignupView}/>
      <ProtectedRoute {...state} path={NavigationPath.CardDatabase} render={CardDatabaseView}/>
      <ProtectedRoute {...state} path={NavigationPath.CardCollection} render={CardCollectionView}/>
      <Route {...state} path={`/set/:code`} render={SetView}/>
      <Route {...state} path={`/card/:id`} render={CardView}/>
      <ProtectedRoute {...state} path={NavigationPath.Admin} render={AdminView}/>
      <FooterView/>
    </div>
  )
}

const rawEventSubscription = (name) => {
  return ((fx) => {
    return (action) => {
      return [fx, { action }]
    }
  })((dispatch, props) => {
    const listener = (event) => {
      dispatch(props.action, event)
    }
    addEventListener(name, listener)
    // TODO
    // return () => {
    //   removeEventListener(name, listener)
    // }
  })
}

export const onPopstateSubscription = rawEventSubscription('popstate')

const authSubscription = ((fx) => {
  return (action) => {
    return [fx, { action }]
  }
})((dispatch, props) => {
  const listener = (authorized) => {
    dispatch(props.action, authorized)
  }
  firebase.auth().onAuthStateChanged((user: firebase.User) => listener(!!user))
})

const getSetsSubscription = ((fx) => {
  return (action) => {
    return [fx, { action }]
  }
})(async (dispatch, props) => {
  const listener = (s) => {
    dispatch(props.action, s)
  }

  // TODO: try catch
  const sets: MagicSet[] = await CardDatabaseService.getSets()
  listener(sets)
})

const getSetSubscription = ((fx) => {
  return (action) => {
    return [fx, { action }]
  }
})(async (dispatch, props) => {
  const listener = async (event) => {
    const id = event.detail

    console.log(id)

    if (!id) {
      return
    }

    // TODO: try catch
    const response = await Promise.all([
      CardDatabaseService.getCardsBySet(id),
      CardDatabaseService.getSet(id),
    ])

    console.log(response)

    dispatch(props.action, response)
  }

  addEventListener('init-set-view', listener)
})

const getCardSubscription = ((fx) => {
  return (action) => {
    return [fx, { action }]
  }
})(async (dispatch, props) => {
  const listener = async (event) => {
    const id = event.detail

    console.log(id)

    if (!id) {
      return
    }

    // TODO: try catch
    const response = await Promise.all([
      CardDatabaseService.getCardById(id),
      CardDatabaseService.getCardMoreInfo(id),
      CardDatabaseService.getUserCardCount(id),
    ])

    console.log(response)

    dispatch(props.action, response)
  }

  addEventListener('init-card-view', listener)
})

app({
  init: initialState,
  view,
  subscriptions: (state: AppState) => [
    onPopstateSubscription(appActions.location.setCurrent),
    authSubscription(appActions.auth.authorize),
    getSetsSubscription(appActions.cardDatabase.getSetsCommit),
    getSetSubscription(appActions.cardSet.getCardsCommit),
    getCardSubscription(appActions.card.getCardCommit),
  ],
  node: document.getElementById('app'),
})

addEventListener('build', (a) => console.log(a))
