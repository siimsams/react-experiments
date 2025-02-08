import React, { PureComponent, cloneElement } from "react";

export interface RecycledListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactElement;

  /**
   * If you **know** how many items fit in the container at once,
   * e.g. 7 items, pass `visibleCount={7}`.
   * The component will measure the container, then compute:
   *    elementSize = containerSize / visibleCount
   */
  visibleCount?: number;

  /**
   * If overscan = 2, we render 2 items before and 2 items after the visible range
   * to reduce flicker.
   */
  overscan?: number;

  /** "x" for horizontal scrolling, "y" for vertical (default "y") */
  direction?: "x" | "y";
}

interface RecycledListState {
  /** Current scroll offset */
  scroll: number;

  visibleCount: number;

  /** The container size (width if `direction="x"`, else height) */
  containerSize: number;

  /** The computed size of each item. Derived from visibleCount or other logic. */
  itemSize: number | null;

  direction: "x" | "y";
}

export default class RecycledList<T> extends PureComponent<
  RecycledListProps<T>,
  RecycledListState
> {
  private containerRef = React.createRef<HTMLDivElement>();
  private itemRefs: Record<number, HTMLDivElement | null> = {};

  private scrollRAF: number | null = null;
  private resizeRAF: number | null = null;

  private ignoreScroll = false;

  constructor(props: RecycledListProps<T>) {
    super(props);

    const { direction = "y" } = props;
    this.state = {
      scroll: 0,
      visibleCount: props.visibleCount || 0,
      containerSize: 0,
      itemSize: null,
      direction,
    };
  }

  componentDidMount() {
    this.measureContainer();

    if (this.containerRef.current) {
      this.containerRef.current.addEventListener("scroll", this.handleScroll);
    }
    window.addEventListener("resize", this.handleResize);
  }

  componentWillUnmount() {
    if (this.containerRef.current) {
      this.containerRef.current.removeEventListener(
        "scroll",
        this.handleScroll,
      );
    }
    window.removeEventListener("resize", this.handleResize);
  }

  measureContainer = () => {
    const container = this.containerRef.current;
    if (!container) return;

    const { clientWidth, clientHeight } = container;
    const containerSize =
      this.state.direction === "x" ? clientWidth : clientHeight;

    let nextItemSize = this.state.itemSize;

    // If user gave us visibleCount, compute itemSize from container
    if (this.props.visibleCount && this.props.visibleCount > 0) {
      nextItemSize = containerSize / this.props.visibleCount;
    }

    this.setState({
      containerSize,
      itemSize: nextItemSize,
    });
  };

  handleScroll = () => {
    if (this.ignoreScroll || this.resizeRAF) {
      return;
    }

    console.log("handleScroll");

    if (this.scrollRAF) {
      cancelAnimationFrame(this.scrollRAF);
    }
    this.scrollRAF = requestAnimationFrame(() => {
      if (!this.containerRef.current) return;
      const scrollPos =
        this.state.direction === "x"
          ? this.containerRef.current.scrollLeft
          : this.containerRef.current.scrollTop;

      this.setState({ scroll: scrollPos });
      this.scrollRAF = null;
    });
  };

  handleResize = () => {
    if (!this.containerRef.current) return;
    
    this.ignoreScroll = true;
  
    if (this.resizeRAF) {
      cancelAnimationFrame(this.resizeRAF);
    }
  
    this.resizeRAF = requestAnimationFrame(() => {
      const { itemSize, scroll } = this.state;
  
      // Calculate the first visible index
      const firstVisibleIndex = itemSize ? Math.floor(scroll / itemSize) : 0;
  
      // Measure new container size
      this.measureContainer();
  
      this.setState((prevState) => {
        const newItemSize = prevState.containerSize / prevState.visibleCount;
        const newScrollPos = firstVisibleIndex * newItemSize;
  
        // Ensure the correct item stays visible
        this.containerRef.current!.scrollTo({
          [prevState.direction === "x" ? "left" : "top"]: newScrollPos,
        });
  
        return {
          itemSize: newItemSize,
          scroll: newScrollPos,
        };
      });
  
      this.resizeRAF = null;
      
      setTimeout(() => {
        this.ignoreScroll = false;
      }, 100);
    });
  };  

  getVisibleItems() {
    const { data, overscan = 2, renderItem } = this.props;
    const { scroll, containerSize, visibleCount, direction } = this.state;

    const itemSize = containerSize / visibleCount;

    // Normal virtualization math
    const startIndex = Math.floor(scroll / itemSize);
    const safeStartIndex = Math.max(0, startIndex - overscan);
    const endIndex = Math.min(
      data.length - 1,
      startIndex + visibleCount + overscan,
    );

    const itemsToRender = [];
    for (let i = safeStartIndex; i <= endIndex; i++) {
      const item = data[i];
      const element = renderItem(item, i);

      // Merge the user style with absolute positioning
      const userStyle = element.props.style || {};
      const mergedStyle: React.CSSProperties = {
        ...userStyle,
        position: "absolute",
        [direction === "x" ? "left" : "top"]: i * itemSize,
        [direction === "x" ? "top" : "left"]: 0,
      };

      itemsToRender.push({
        element,
        index: i,
        style: mergedStyle,
      });
    }
    return itemsToRender;
  }

  render() {
    const { direction = "y" } = this.props;

    const visibleItems = this.getVisibleItems();

    return (
      <div
        ref={this.containerRef}
        style={{
          position: "relative",
          overflow: "auto",
          width: "100%",
          height: "100%",
        }}
      >
        <div
          style={{
            position: "relative",
            [direction === "x" ? "width" : "height"]: 1000,
            [direction === "x" ? "height" : "width"]: "100%",
          }}
        >
          {visibleItems.map(({ element, index, style }) =>
            cloneElement(element, {
              key: index,
              ref: (el: HTMLDivElement | null) => {
                this.itemRefs[index] = el;
              },
              style,
            }),
          )}
        </div>
      </div>
    );
  }
}
