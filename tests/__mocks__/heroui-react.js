// Mock for @heroui/react - ESM module not compatible with ts-jest/jest-resolve
const React = require("react");

const Button = ({ children, onPress, onPressStart, onPressEnd, ...props }) =>
    React.createElement("button", { onClick: onPress, ...props }, children);

const ButtonGroup = ({ children }) =>
    React.createElement("div", null, children);

const Dropdown = ({ children }) =>
    React.createElement("div", null, children);

Dropdown.Popover = ({ children }) => React.createElement("div", null, children);
Dropdown.Menu = ({ children }) => React.createElement("div", null, children);
Dropdown.Item = ({ children, ...props }) => React.createElement("div", props, children);

const Label = ({ children }) =>
    React.createElement("label", null, children);

const SwitchThumb = () => React.createElement(React.Fragment, null);

const Switch = ({ children, isSelected, onChange, ...props }) =>
    React.createElement(
        "label",
        null,
        React.createElement("input", {
            type: "checkbox",
            role: "switch",
            checked: isSelected,
            onChange: (e) => onChange?.(e.target.checked),
            ...props,
        }),
        children
    );

Switch.Control = ({ children }) => React.createElement(React.Fragment, null, children);
Switch.Thumb = SwitchThumb;

const Modal = ({ children, isOpen, onOpenChange, ...props }) =>
    React.createElement("div", { "data-testid": "modal", ...props }, children);

Modal.Backdrop = ({ children }) => React.createElement("div", { "data-testid": "modal-backdrop" }, children);
Modal.Container = ({ children }) => React.createElement("div", { "data-testid": "modal-container" }, children);
Modal.Dialog = ({ children, className }) => React.createElement("div", { "data-testid": "modal-dialog", className }, children);
Modal.Header = ({ children, className }) => React.createElement("div", { "data-testid": "modal-header", className }, children);
Modal.Body = ({ children, className }) => React.createElement("div", { "data-testid": "modal-body", className }, children);
Modal.Footer = ({ children, className }) => React.createElement("div", { "data-testid": "modal-footer", className }, children);
Modal.CloseTrigger = ({ children, onPress, ...props }) => React.createElement("button", { "data-testid": "modal-close-trigger", onClick: onPress, ...props }, children);

const Accordion = ({ children }) => React.createElement("div", { "data-testid": "accordion" }, children);
Accordion.Item = ({ children }) => React.createElement("div", { "data-testid": "accordion-item" }, children);
Accordion.Heading = ({ children }) => React.createElement("div", { "data-testid": "accordion-heading" }, children);
Accordion.Trigger = ({ children }) => React.createElement("button", { "data-testid": "accordion-trigger" }, children);
Accordion.Indicator = () => React.createElement("svg", { "data-testid": "accordion-indicator" });
Accordion.Panel = ({ children }) => React.createElement("div", { "data-testid": "accordion-panel" }, children);
Accordion.Body = ({ children }) => React.createElement("div", { "data-testid": "accordion-body" }, children);

const Calendar = ({ children }) => React.createElement("div", { "data-testid": "calendar" }, children);
Calendar.Header = ({ children }) => React.createElement("div", { "data-testid": "calendar-header" }, children);
Calendar.Grid = ({ children }) => React.createElement("div", { "data-testid": "calendar-grid" }, children);
Calendar.GridHeader = ({ children }) => React.createElement("div", { "data-testid": "calendar-grid-header" }, children);
Calendar.HeaderCell = ({ children }) => React.createElement("div", { "data-testid": "calendar-header-cell" }, children);
Calendar.GridBody = ({ children }) => React.createElement("div", { "data-testid": "calendar-grid-body" }, children);
Calendar.Cell = ({ date }) => React.createElement("div", { "data-testid": "calendar-cell", "data-date": String(date) });
Calendar.YearPickerTrigger = ({ children }) => React.createElement("div", { "data-testid": "calendar-year-picker-trigger" }, children);
Calendar.YearPickerTriggerHeading = () => React.createElement("div", { "data-testid": "calendar-year-picker-trigger-heading" });
Calendar.YearPickerTriggerIndicator = () => React.createElement("svg", { "data-testid": "calendar-year-picker-trigger-indicator" });
Calendar.NavButton = ({ slot }) => React.createElement("button", { "data-testid": `calendar-nav-${slot}` });
Calendar.YearPickerGrid = ({ children }) => React.createElement("div", { "data-testid": "calendar-year-picker-grid" }, children);
Calendar.YearPickerGridBody = ({ children }) => React.createElement("div", { "data-testid": "calendar-year-picker-grid-body" }, children);
Calendar.YearPickerCell = ({ year }) => React.createElement("div", { "data-testid": "calendar-year-picker-cell", "data-year": year });

const DateField = ({ children, ...props }) => React.createElement("div", { "data-testid": "date-field", ...props }, children);
DateField.Group = ({ children, ...props }) => React.createElement("div", { "data-testid": "date-field-group", ...props }, children);
DateField.Input = ({ children, ...props }) => React.createElement("div", { "data-testid": "date-field-input", ...props }, children);
DateField.Segment = ({ segment }) => React.createElement("span", { "data-testid": "date-field-segment", "data-segment": segment });
DateField.Suffix = ({ children }) => React.createElement("div", { "data-testid": "date-field-suffix" }, children);

const DatePicker = ({ children, ...props }) => React.createElement("div", { "data-testid": "date-picker", ...props }, children);
DatePicker.Trigger = ({ children }) => React.createElement("div", { "data-testid": "date-picker-trigger" }, children);
DatePicker.TriggerIndicator = ({ ...props }) => React.createElement("svg", { "data-testid": "date-picker-trigger-indicator", ...props });
DatePicker.Popover = ({ children }) => React.createElement("div", { "data-testid": "date-picker-popover" }, children);

const Input = ({ children, ...props }) => React.createElement("input", { ...props }, children);

const Select = ({ children, ...props }) => React.createElement("select", { ...props }, children);
Select.Trigger = ({ children }) => React.createElement("div", null, children);
Select.Value = ({ children }) => React.createElement("div", null, children);
Select.Content = ({ children }) => React.createElement("div", null, children);
Select.Item = ({ children, ...props }) => React.createElement("option", { ...props }, children);

const Textarea = ({ ...props }) => React.createElement("textarea", { ...props });

const Card = ({ children, ...props }) => React.createElement("div", { "data-testid": "card", ...props }, children);
Card.Header = ({ children, ...props }) => React.createElement("div", { "data-testid": "card-header", ...props }, children);
Card.Body = ({ children, ...props }) => React.createElement("div", { "data-testid": "card-body", ...props }, children);
Card.Footer = ({ children, ...props }) => React.createElement("div", { "data-testid": "card-footer", ...props }, children);

module.exports = {
    Button,
    ButtonGroup,
    Dropdown,
    Label,
    Switch,
    SwitchControl: Switch.Control,
    SwitchThumb,
    Modal,
    ModalBackdrop: Modal.Backdrop,
    ModalContainer: Modal.Container,
    ModalDialog: Modal.Dialog,
    ModalHeader: Modal.Header,
    ModalBody: Modal.Body,
    ModalFooter: Modal.Footer,
    ModalCloseTrigger: Modal.CloseTrigger,
    Accordion,
    AccordionItem: Accordion.Item,
    Calendar,
    DateField,
    DatePicker,
    Input,
    Select,
    Textarea,
    Card,
};