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
    if (this.resizeRAF) {
      return;
    }

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
    if (this.resizeRAF) cancelAnimationFrame(this.resizeRAF);
  
    this.resizeRAF = requestAnimationFrame(() => {
      const { itemSize: oldItemSize, scroll: oldScroll } = this.state;
      const virtualIndex = oldItemSize ? oldScroll / oldItemSize : 0;
      const container = this.containerRef.current!;
  
      // Use the appropriate container size based on direction
      const newContainerSize =
        this.state.direction === "x"
          ? container.clientWidth
          : container.clientHeight;
      const newItemSize = newContainerSize / (this.props.visibleCount || 7);
      const newScroll = virtualIndex * newItemSize;
  
      // Update the correct scroll property based on direction
      if (this.state.direction === "x") {
        container.scrollLeft = newScroll;
      } else {
        container.scrollTop = newScroll;
      }
  
      this.setState({
        containerSize: newContainerSize,
        itemSize: newItemSize,
        scroll: newScroll,
      });
  
      this.resizeRAF = null;
    });
  };
  
  

  getVisibleItems() {
    const { data, overscan = 2, renderItem } = this.props;
    const { scroll, containerSize, visibleCount, direction, itemSize } = this.state;
  
    // itemSize should now be up-to-date
    const size = itemSize || containerSize / visibleCount;
  
    const startIndex = Math.floor(scroll / size);
    const safeStartIndex = Math.max(0, startIndex - overscan);
    const endIndex = Math.min(data.length - 1, startIndex + visibleCount + overscan);
  
    const itemsToRender = [];
    for (let i = safeStartIndex; i <= endIndex; i++) {
      const item = data[i];
      const element = renderItem(item, i);
  
      // Using transform: translateX to position the item
      const translateValue = i * size;
      const mergedStyle: React.CSSProperties = {
        ...element.props.style,
        position: "absolute",
        transform: direction === "x"
          ? `translate3d(${translateValue}px, 0, 0)`
          : `translate3d(0, ${translateValue}px, 0)`,
        width: direction === "x" ? `${size}px` : "100%",
        height: direction === "x" ? "100%" : `${size}px`,
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
            [direction === "x" ? "width" : "height"]: 100000,
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
