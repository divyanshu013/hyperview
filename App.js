import React from 'react';
import {
  Animated,
  Button,
  Easing,
  FlatList,
  SectionList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from 'react-native';
import VisibilityDetectingView from './VisibilityDetectingView.js';
import { Font, MapView } from 'expo';
import { createStackNavigator } from 'react-navigation';
import { NavigationActions } from 'react-navigation';

import { DOMParser, XMLSerializer } from 'xmldom';

//const ROOT = 'http://192.168.7.20:8080';
//const ROOT = 'http://10.1.10.14:8080';
const ROOT = 'http://127.0.0.1:8080';


const ROUTE_KEYS = {
};


/**
 * STATEFUL COMPONENTS
 */
class HVFlatList extends React.Component {
  constructor(props) {
    super(props);
    this.parser = new DOMParser();
    this.state = {
      refreshing: false,
      element: props.element,
    };
  }

  refresh() {
    const element = this.state.element;
    this.setState({refreshing: true});
    const path = element.getAttribute('href');
    const url = ROOT + path;
    fetch(url, {headers: {'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': 0}})
      .then((response) => response.text())
      .then((responseText) => {
        const doc = this.parser.parseFromString(responseText);
        this.setState({refreshing: false, element: doc.documentElement});
      });
  }

  render() {
    const { element, refreshing } = this.state;
    const { navigation, stylesheet, animations, onUpdate } = this.props;
    const styleAttr = element.getAttribute('style');
    const style = styleAttr ? styleAttr.split(',').map((s) => stylesheet[s]) : null;

    const listProps = {
      style,
      data: element.getElementsByTagName('item'),
      keyExtractor: (item, index) => {
        return item.getAttribute('key');
      },
      renderItem: ({ item }) => {
        return renderElement(item, navigation, stylesheet, animations, onUpdate );
      },
    };

    let refreshProps = {};
    if (element.getAttribute('trigger') === 'refresh') {
      refreshProps = {
        onRefresh: () => { this.refresh() },
        refreshing,
      };
    }

    return React.createElement(
      FlatList,
      Object.assign(listProps, refreshProps),
    );
  }
}


/**
 * STATEFUL COMPONENTS
 */
class HVSectionList extends React.Component {
  constructor(props) {
    super(props);
    this.parser = new DOMParser();
    this.state = {
      refreshing: false,
      element: props.element,
    };
  }

  refresh() {
    console.log('REFRESHING!');
    const element = this.state.element;
    this.setState({refreshing: true});
    const path = element.getAttribute('href');
    const url = ROOT + path;
    fetch(url, {headers: {'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': 0}})
      .then((response) => response.text())
      .then((responseText) => {
        const doc = this.parser.parseFromString(responseText);
        this.setState({refreshing: false, element: doc.documentElement});
      });
  }

  render() {
    const { element, refreshing } = this.state;
    const { navigation, stylesheet, animations, onUpdate } = this.props;
    const styleAttr = element.getAttribute('style');
    const style = styleAttr ? styleAttr.split(',').map((s) => stylesheet[s]) : null;

    const sectionElements = element.getElementsByTagName('section');
    const sections = [];

    for (let i = 0; i < sectionElements.length; ++i) {
      const sectionElement = sectionElements.item(i);
      const itemElements = sectionElement.getElementsByTagName('item');
      const items = [];
      for (let j = 0; j < itemElements.length; ++j) {
        const itemElement = itemElements.item(j);
        items.push(itemElement);
      }
      const titleElement = sectionElement.getElementsByTagName('sectiontitle').item(0);
      sections.push({
        title: titleElement,
        data: items,
      });
    }

    const listProps = {
      style,
      sections,
      keyExtractor: (item, index) => {
        return item.getAttribute('key');
      },
      renderItem: ({ item, index, section }) => {
        return renderElement(item, navigation, stylesheet, animations, onUpdate );
      },
      renderSectionHeader: ({section: { title }}) => {
        return renderElement(title, navigation, stylesheet, animations, onUpdate );
      },
    };

    let refreshProps = {};
    if (element.getAttribute('trigger') === 'refresh') {
      refreshProps = {
        onRefresh: () => { this.refresh() },
        refreshing,
      };
    }

    return React.createElement(
      SectionList,
      Object.assign(listProps, refreshProps),
    );
  }
}


class HVTextInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      focused: false,
    };
  }

  render() {
    const { element, navigation, stylesheet, animations, onUpdate } = this.props;
    const props = Object.assign(
      createProps(element, stylesheet, animations),
      {
        multiline: element.tagName == 'textarea',
      },
      {
        onFocus: () => this.setState({focused: true}),
        onBlur: () => this.setState({focused: false}),
      }
    );

    if (this.state.focused && props.focusStyles) {
      props.style = props.focusStyles.split(',').map((s) => stylesheet[s]);
    }

    const input = React.createElement(
      TextInput,
      props,
    );

    const labelElement = getFirstTag(element, 'label');
    const helpElement = getFirstTag(element, 'help');

    const label = labelElement ? text(labelElement, navigation, stylesheet, animations, onUpdate) : null;
    const help = helpElement ? text(helpElement, navigation, stylesheet, animations, onUpdate) : null;

    let outerStyles = null;
    if (props.outerStyles) {
      outerStyles = props.outerStyles.split(',').map((s) => stylesheet[s]);
    }

    return React.createElement(
      View,
      {style: outerStyles},
      label,
      input,
      help
    );
  }
}


class HyperRef extends React.Component {
  constructor(props) {
    super(props);
    const { element } = props;
    this.state = {
      refreshing: false,
      element
    };

    this.parser = new DOMParser();

    this.triggerPropNames = {
      'press': 'onPress',
      'longPress': 'onLongPress',
      'pressIn': 'onPressIn',
      'pressOut': 'onPressOut',
    };

    this.pressTriggers = ['press', 'longPress', 'pressIn', 'pressOut'];
    this.navActions = ['push', 'new', 'back', 'navigate'];
    this.updateActions = ['replace', 'replace-inner', 'append', 'prepend'];
  }

  createActionHandler(element, navigation, onUpdate) {
    const action = element.getAttribute('action') || 'push';

    if (this.navActions.indexOf(action) >= 0) {
      return createNavHandler(element, navigation);
    }

    if (this.updateActions.indexOf(action) >= 0) {
      return() => {
        const path = element.getAttribute('href');

        onUpdate(path, action, element, null);

        /*
        const url = ROOT + path;
        fetch(url, {headers: {'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': 0}})
          .then((response) => response.text())
          .then((responseText) => {
            const fragment = this.parser.parseFromString(responseText);
            const fragmentElement = fragment.documentElement;

            let newElement = null;
            if (action == 'replace') {
              newElement = fragmentElement;
            } else if (action == 'replace-inner') {
              newElement = element.cloneNode(false);
              newElement.appendChild(fragmentElement);
            } else if (action == 'append') {
              newElement = element.cloneNode(true);
              newElement.appendChild(fragmentElement);
            } else if (action == 'prepend') {
              newElement = element.cloneNode(true);
              // If no children, append. Otherwise, insert before first child.
              if (newElement.hasChildNodes()) {
                newElement.insertBefore(fragmentElement, newElement.firstChild)
              } else {
                newElement.appendChild(fragmentElement);
              }
            }

            this.setState({
              element: newElement,
              refreshing: false,
            });
          });
          */
      }
    }
  }

  render() {
    const { element, refreshing } = this.state;
    const { navigation, stylesheet, animations, onUpdate } = this.props;

    const href = element.getAttribute('href');
    if (!href) {
      return renderElement(element, navigation, stylesheet, animations, onUpdate, {skipHref: true});
    }

    const trigger = element.getAttribute('trigger') || 'press';

    // Render pressable element
    if (this.pressTriggers.indexOf(trigger) >= 0) {
      const props = {
        // Component will use touchable opacity to trigger href.
        activeOpacity: 0.5,
      };
      const triggerPropName = this.triggerPropNames[trigger];
      // For now only navigate.
      props[triggerPropName] = this.createActionHandler(element, navigation, onUpdate);

      return React.createElement(
        TouchableOpacity,
        props,
        renderElement(element, navigation, stylesheet, animations, onUpdate, {skipHref: true}),
      );
    }

    if (trigger == 'visible') {
      return React.createElement(
        VisibilityDetectingView,
        {
          onVisible: this.createActionHandler(element, navigation, onUpdate),
        },
        renderElement(element, navigation, stylesheet, animations, {skipHref: true})
      );
    }

    if (trigger == 'refresh') {
      const refreshControl = React.createElement(
        RefreshControl,
        { refreshing, onRefresh: this.createActionHandler(element, navigation) },
      );
      return React.createElement(
        ScrollView,
        { refreshControl },
        renderElement(element, navigation, stylesheet, animations, onUpdate, {skipHref: true})
      );
    }

    return null;
  }
}


function addHref(component, element, navigation, stylesheet, animations, onUpdate ) {
  const href = element.getAttribute('href');
  if (!href) {
    return component;
  }

  return React.createElement(
    HyperRef,
    { element, navigation, stylesheet, animations, onUpdate },
    ...renderChildren(element, navigation, stylesheet, animations, onUpdate)
  );
}


/**
 * UTILITIES
 */
function getHrefKey(href) {
  return href.split('?')[0];
}

function getFirstTag(rootNode, tagName) {
  elements = rootNode.getElementsByTagName(tagName);
  if (elements  && elements[0]) {
    return elements[0];
  }
  return null;
}


/**
 *
 */
function createProps(element, stylesheet, animations) {
  const numericRules = [
    'numberOfLines',
  ];
  const booleanRules = [
    'multiline',
  ];

  const props = {};
  if (element.attributes === null) {
    return props;
  }
  for (let i = 0; i < element.attributes.length; ++i) {
    let attr = element.attributes.item(i);
    if (numericRules.indexOf(attr.name) >= 0) {
      let intValue = parseInt(attr.value, 10);
      props[attr.name] = intValue || 0;
    } else if (booleanRules.indexOf(attr.name) >= 0) {
      props[attr.name] = attr.value == 'true';
    } else {
      props[attr.name] = attr.value;
    }
  }
  if (props.style) {
    props.style = props.style.split(',').map((s) => stylesheet[s]);
  }
  if (props.animatedValues) {
    const values = props.animatedValues.split(',').forEach((v) => {
      const value = animations.values[v];
      const property = animations.properties[v];
      if (value !== undefined && property !== undefined) {
        const animatedStyle = {};
        animatedStyle[property] = value;
        props.style = props.style || [];
        props.style.push(animatedStyle);
      }
    });
  }
  return props;
}

/**
 *
 */
function createNavHandler(element, navigation) {
  let navHandler = null;
  const href = element.getAttribute('href');
  const action = element.getAttribute('action');
  const preload = element.getAttribute('targetPreload');

  if (!href) {
    return navHandler;
  }

  let navFunction = navigation.push;
  let navRoute = 'Stack';
  let key = null;

  if (action == 'push') {
    // push a new screen on the stack
    navFunction = navigation.push;
  } else if (action == 'replace') {
    // replace current screen
    navFunction = navigation.replace;
  } else if (action == 'navigate') {
    // Return to the screen, if it exists
    navFunction = navigation.navigate;
    key = ROUTE_KEYS[getHrefKey(href)];
  } else if (action == 'modal') {
    navRoute = 'Modal';
  }

  if (action == 'back') {
    navHandler = () => navigation.goBack();
  } else {
    navHandler = () => {
      console.log('navigating to ', key, 'href: ', href, 'preload: ', preload);
      let preloadScreen = null;
      if (preload) {
        const rootElement = element.ownerDocument;
        const screens = rootElement.getElementsByTagName('screen');
        preloadScreen = Array.from(screens).find((s) => s.getAttribute('id') == preload);
      }
      navFunction(
        navRoute,
        {
          href,
          preloadScreen,
        },
        {},
        key
      );
    }
  }

  return navHandler;
}

/**
 *
 */
function body(element, navigation, stylesheet, animations, onUpdate) {
  const props = createProps(element, stylesheet, animations);
  let component = props.animations ? Animated.View : View;
  if (element.getAttribute('scroll')) {
    component = props.animated ? Animated.ScrollView : ScrollView;
  }

  return React.createElement(
    component,
    props,
    ...renderChildren(element, navigation, stylesheet, animations, onUpdate)
  );
}

/**
 *
 */
function image(element, navigation, stylesheet, animations, onUpdate) {
  const imageProps = {};
  if (element.getAttribute('source')) {
    let source = element.getAttribute('source');
    if (!source.startsWith('http')) {
      source = ROOT + source;
    }
    imageProps.source = { uri: source };
  }
  const props = Object.assign(
    createProps(element, stylesheet, animations),
    imageProps
  );
  return React.createElement(
    props.animations ? Animated.Image : Image,
    props
  );
}

/**
 *
 */
function input(element, navigation, stylesheet, animations, onUpdate) {
  return React.createElement(
    HVTextInput,
    { element, navigation, stylesheet, animations, onUpdate }
  );
}

/**
 *
 */
function map(element, navigation, stylesheet) {
  const mapProps = {};
  const geocode = element.getAttribute('geocode');
  if (geocode) {
    const parts = geocode.split(',');
    mapProps.initialRegion = {
      latitude: parseFloat(parts[0]),
      longitude: parseFloat(parts[1]),
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
  }

  const props = Object.assign(
    createProps(element, stylesheet),
    mapProps
  );
  return React.createElement(
    MapView,
    props,
    ...renderChildren(element, navigation, stylesheet)
  );
}

/**
 *
 */
function mapMarker(element, navigation, stylesheet) {
  const mapProps = {};
  const geocode = element.getAttribute('geocode');
  if (geocode) {
    const parts = geocode.split(',');
    mapProps.coordinate = {
      latitude: parseFloat(parts[0]),
      longitude: parseFloat(parts[1]),
    };
  }

  const props = Object.assign(
    createProps(element, stylesheet),
    mapProps
  );
  return React.createElement(
    MapView.Marker,
    props
  );
}

/**
 *
 */
function view(element, navigation, stylesheet, animations, onUpdate, options) {
  const { skipHref } = options || {};
  const props = createProps(element, stylesheet, animations);
  let component = React.createElement(
    props.animations ? Animated.View : View,
    props,
    ...renderChildren(element, navigation, stylesheet, animations, onUpdate)
  );
  return skipHref ? component : addHref(component, element, navigation, stylesheet, animations, onUpdate);
}

/**
 *
 */
function list(element, navigation, stylesheet, animations, onUpdate) {
  return React.createElement(
    HVFlatList,
    { element, navigation, stylesheet, animations, onUpdate },
  );
}

/**
 *
 */
function sectionlist(element, navigation, stylesheet, animations, onUpdate) {
  return React.createElement(
    HVSectionList,
    { element, navigation, stylesheet, animations, onUpdate },
  );
}

/**
 *
 */
function text(element, navigation, stylesheet, animations, onUpdate, options) {
  const { skipHref } = options || {};
  const props = createProps(element, stylesheet, animations);
  let component = React.createElement(
    props.animations? Animated.Text : Text,
    props,
    ...renderChildren(element, navigation, stylesheet, animations, onUpdate)
  );

  return skipHref ? component : addHref(component, element, navigation, stylesheet, animations, onUpdate);
}

/**
 *
 */
function renderHeader(element, navigation, stylesheet, animations, onUpdate) {
  const headers = element.getElementsByTagName('header');
  if (!(headers && headers[0])) {
    return null;
  }
  const header = headers[0];

  headerComponent = renderElement(
    header,
    navigation,
    stylesheet,
    animations,
    onUpdate
  );

  navigation.setParams({
    headerComponent,
  });
}

/**
 *
 */
function renderChildren(element, navigation, stylesheet, animations, onUpdate) {
  const children = [];
  if (element.childNodes !== null) {
    for (let i = 0; i < element.childNodes.length; ++i) {
      let e = renderElement(element.childNodes.item(i), navigation, stylesheet, animations, onUpdate);
      if (e) {
        children.push(e);
      }
    }
  }
  return children;
}

/**
 *
 */
function renderElement(element, navigation, stylesheet, animations, onUpdate, options) {
  switch (element.tagName) {
    case 'body':
      return body(element, navigation, stylesheet, animations, onUpdate); 
    case 'image':
      return image(element, navigation, stylesheet, animations, onUpdate); 
    case 'input':
    case 'textarea':
      return input(element, navigation, stylesheet, animations, onUpdate); 
    case 'text':
    case 'label':
    case 'help':
      return text(element, navigation, stylesheet, animations, onUpdate, options); 
    case 'view':
    case 'header':
    case 'item':
    case 'sectiontitle':
      return view(element, navigation, stylesheet, animations, onUpdate, options); 
    case 'list':
      return list(element, navigation, stylesheet, animations, onUpdate); 
    case 'sectionlist':
      return sectionlist(element, navigation, stylesheet, animations, onUpdate); 
    case 'map':
      return map(element, navigation, stylesheet, animations); 
    case 'map-marker':
      return mapMarker(element, navigation, stylesheet); 
  }

  if (element.nodeValue && element.nodeValue.trim().length > 0) {
    return element.nodeValue.trim();
  }
  return null;
}

/**
 *
 */
function createStylesheet(element) {
  const numericRules = [
    'borderBottomWidth',
    'borderLeftWidth',
    'borderRadius',
    'borderRightWidth',
    'borderTopWidth',
    'borderWidth',
    'flex',
    'flexGrow',
    'flexShrink',
    'fontSize',
    'height',
    'lineHeight',
    'margin',
    'marginBottom',
    'marginLeft',
    'marginRight',
    'marginTop',
    'padding',
    'paddingBottom',
    'paddingLeft',
    'paddingRight',
    'paddingTop',
    'width',
    "top",
    "bottom",
    "left",
    "right",
  ];
  const styles = element.getElementsByTagName('styles');
  const stylesheet = {};
  if (styles && styles[0]) {
    const ruleElements = styles[0].getElementsByTagName('rule');

    for (let i = 0; i < ruleElements.length; ++i) {
      const ruleElement = ruleElements.item(i);
      const ruleId = ruleElement.getAttribute('id');
      if (!ruleId) {
        return;
      }

      const ruleStyles = {};
      for (let j = 0; j < ruleElement.attributes.length; ++j) {
        let attr = ruleElement.attributes.item(j);
        if (attr.name !== 'id') {
          if (numericRules.indexOf(attr.name) >= 0) {
            let intValue = parseInt(attr.value, 10);
            ruleStyles[attr.name] = intValue || 0;
          } else {
            ruleStyles[attr.name] = attr.value;
          }
        }
      }
      stylesheet[ruleId] = ruleStyles;
    };
  }

  return StyleSheet.create(stylesheet); 
}

/**
 *
 */
function createAnimations(element) {
  const animatedValues = {};
  const animatedTimings = {};
  const animatedProperties = {};
  const returnValue = {
    values: animatedValues,
    timings: animatedTimings,
    properties: animatedProperties,
  };

  if (!element) {
    return returnValue;
  }

  const animated = getFirstTag(element, 'animated');
  if (!animated) {
    return returnValue;
  }

  const childElements = Array.from(animated.childNodes).filter((n) => n.nodeType == 1) || [];

  const valueElements = childElements.filter((e) => e.tagName == 'value');
  const animationElements = childElements.filter((e) => e.tagName == 'animation');

  valueElements.forEach((v) => {
    const id = v.getAttribute('id');
    const fromValue = parseInt(v.getAttribute('from'));
    const property = v.getAttribute('property');
    animatedValues[id] = new Animated.Value(fromValue);
    animatedProperties[id] = property;
  });

  animationElements.forEach((v) => {
    const id = v.getAttribute('id');
    animatedTimings[id] = createAnimation(v, animatedValues);
  });
  return returnValue;
}

function createAnimation(element, animatedValues) {
  const type = element.getAttribute('type');

  if (type == 'sequence' || type == 'parallel') {
    const animations = Array.from(element.childNodes).filter((n) => n.nodeType == 1).map((e) => {
      return createAnimation(e, animatedValues);
    });
    let animation = type == 'sequence' ? Animated.sequence(animations) : Animated.parallel(animations);
    if (element.getAttribute('loop')) {
      animation = Animated.loop(animation);
    }
    return animation;

  } else if (type == 'delay') {
    const duration = parseInt(element.getAttribute('duration'));
    return Animated.delay(duration);
  } else {
    const value = element.getAttribute('value');
    const toValue = parseFloat(element.getAttribute('to'));
    const duration = parseInt(element.getAttribute('duration'));
    const delay = parseInt(element.getAttribute('delay'));
    const easingFunc = element.getAttribute('easing') || 'linear';
    const easing = Easing[easingFunc]();
    return Animated.timing(
      animatedValues[value],
      {
        toValue,
        duration,
        delay,
        easing,
      }
    );
  }

  return null;
}

/**
 *
 */
class HyperScreen extends React.Component {
  static navigationOptions = ({ navigation, navigationOptions, screenProps }) => {
    const header = navigation.getParam('headerComponent');
    const headerRight = navigation.getParam('headerRight');
    const headerLeft = navigation.getParam('headerLeft');
    const options = {
      header,
      headerRight,
    };
    if (headerLeft) {
      options.headerLeft = headerLeft;
    }
    return options;
  }

  constructor(props){
    super(props);
    this.parser = new DOMParser();
    this.serializer = new XMLSerializer();
    this.needsLoad = false;
    this.state = {
      styles: null,
      doc: null,
      path: null,
    };
    this.onUpdate = this.onUpdate.bind(this);
    this.shallowClone = this.shallowClone.bind(this);
    this.shallowCloneToRoot = this.shallowCloneToRoot.bind(this);
  }

  componentDidMount() {
    const path = this.props.navigation.getParam('href', null);
    const preloadScreen = this.props.navigation.getParam('preloadScreen');
    const preloadStyles = preloadScreen ? createStylesheet(preloadScreen) : null;
    const animations = createAnimations(preloadScreen);

    this.needsLoad = true;
    if (preloadScreen) {
      this.setState({
        doc: preloadScreen,
        styles: preloadStyles,
        path,
        animations,
      });
    } else {
      this.setState({
        path: path,
      });
    }
  }

  componentWillReceiveProps(nextProps) {
    const newHref = nextProps.navigation.state.params.href;
    const oldHref = this.props.navigation.state.params.href;

    if (newHref != oldHref) {
      const preloadScreen = nextProps.navigation.getParam('preloadScreen');
      const stylesheet = preloadScreen ? createStylesheet(preloadScreen) : null;
      const animations = createAnimations(preloadScreen);
      this.needsLoad = true;

      Object.entries(animations.timings).forEach(([key, timing]) => {
        timing.start();
      });

      this.setState({
        doc: preloadScreen,
        styles: stylesheet,
        animations: animations,
        path: newHref,
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.needsLoad) {
      console.log('LOADING: ', this.state.path);
      this.load(this.state.path);
      this.needsLoad = false;
    }
  }

  // UPDATE FRAGMENTS ON SCREEN
  onUpdate(href, action, currentElement, targetId) {
    console.log('ON UPDATE!!!!');
    const url = ROOT + href;
    fetch(url, {headers: {'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': 0}})
      .then((response) => response.text())
      .then((responseText) => {

        let newRoot = this.state.doc;

        const newElement = this.parser.parseFromString(responseText).documentElement;
        let targetElement = targetId ? this.state.doc.getElementById(targetId) : currentElement;
        if (!targetElement) {
          targetElement = currentElement;
        }

        if (action == 'replace') {
          const parentElement = targetElement.parentNode;
          console.log('REPLACE: ');
          console.log(this.serializer.serializeToString(targetElement));
          console.log('WITH: ');
          console.log(this.serializer.serializeToString(newElement));
          console.log('PARENT BEFORE: ');
          console.log(this.serializer.serializeToString(parentElement));
          parentElement.replaceChild(newElement, targetElement);
          console.log('PARENT AFTER: ');
          console.log(this.serializer.serializeToString(parentElement));
          newRoot = this.shallowCloneToRoot(parentElement);
          console.log('NEW COPY: ');
          console.log(this.serializer.serializeToString(newRoot));
        }

        if (action == 'replace-inner') {
          let child = targetElement.firstChild;
          // Remove the target's children
          while (child !== null) {
            let nextChild = child.nextSibling;
            targetElement.removeChild(child);
            child = nextChild;
          }
          targetElement.appendChild(newElement);
          newRoot = this.shallowCloneToRoot(targetElement);
        }

        if (action == 'append') {
          targetElement.appendChild(newElement);
          newRoot = this.shallowCloneToRoot(targetElement);
        }

        if (action == 'prepend') {
          targetElement.insertBefore(newElement, targetElement.firstChild);
          newRoot = this.shallowCloneToRoot(targetElement);
        }

        this.setState({
          doc: newRoot,
        });
      });
  }

  shallowClone(element) {
    console.log('SHALLOW CLONE OF:');
    console.log(this.serializer.serializeToString(element));
    const newElement = element.cloneNode(false);
    let childNode = element.firstChild;
    while (childNode !== null) {
      let nextChild = childNode.nextSibling;
      newElement.appendChild(childNode);
      childNode = nextChild;
    }
    console.log('CLONE:');
    console.log(this.serializer.serializeToString(newElement));

    return newElement;
  }

  shallowCloneToRoot(element, opt_child) {
    const elementClone = this.shallowClone(element);
  }

  /*
  shallowCloneToRoot(element) {
    const elementClone = this.shallowClone(element);
    if (!element.parentNode) {
      return elementClone;
    }

    const parentClone = this.shallowCloneToRoot(element.parentNode);
    parentClone.replaceChild(element, elementClone);
    return parentClone;
  }
  */

  load() {
    const path = this.state.path;
    const url = ROOT + path;
    fetch(url, {headers: {'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': 0}})
      .then((response) => response.text())
      .then((responseText) => {
        const doc = this.parser.parseFromString(responseText);
        const animations = createAnimations(doc);
        const stylesheet = createStylesheet(doc);
        const header = renderHeader(doc, this.props.navigation, stylesheet, animations, this.onUpdate);
        this.props.navigation.setParams({ header });
        ROUTE_KEYS[getHrefKey(path)] = this.props.navigation.state.key;

        Object.entries(animations.timings).forEach(([key, timing]) => {
          timing.start();
        });

        this.setState({
          doc: doc,
          styles: stylesheet,
          animations: animations,
        });
      });
  }

  render() {
    if(!this.state.doc) {
      return (
        <View style={{backgroundColor: 'white', flex: 1}}>
        </View>
      );
    }
    const body = this.state.doc.getElementsByTagName('body')[0];
    return renderElement(body, this.props.navigation, this.state.styles, this.state.animations, this.onUpdate);
  }
}

/**
 *
 */
const MainStack = createStackNavigator(
  {
    Stack: HyperScreen,
  },
  {
    initialRouteName: 'Stack',
    initialRouteParams: {
      href: '/dynamic_elements/index.xml',
    }
  }
);

/**
 *
 */
const RootStack = createStackNavigator(
  {
    Main: MainStack,
    Modal: HyperScreen,
  },
  {
    mode: 'modal',
    headerMode: 'none',
    initialRouteName: 'Main',
  }
);

/**
 *
 */
export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      fontLoaded: false,
    };
  }

  async componentDidMount() {
    await Font.loadAsync({
      'HKGrotesk-Bold': require('./assets/fonts/HKGrotesk-Bold.otf'),
      'HKGrotesk-SemiBold': require('./assets/fonts/HKGrotesk-SemiBold.otf'),
      'HKGrotesk-Medium': require('./assets/fonts/HKGrotesk-Medium.otf'),
      'HKGrotesk-Regular': require('./assets/fonts/HKGrotesk-Regular.otf'),
      'HKGrotesk-Light': require('./assets/fonts/HKGrotesk-Light.otf'),
    });

    this.setState({ fontLoaded: true });
  }

  render() {
    if (!this.state.fontLoaded) {
      return null;
    }
    return <RootStack />;
  }
}
