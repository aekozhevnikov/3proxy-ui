import { DateValue, parseDate } from "@internationalized/date";
import { Calendar, DateField, DatePicker, Label } from "@heroui/react";
import { I18nProvider } from "@react-aria/i18n";

interface Props {
    value?: string;
    label?: string;
    onChange?: (value: string) => void;
}

export default function CustomDatePicker({ value, onChange }: Props) {
    const handleSelection = (v: DateValue | null) => {
        if (!onChange) return;

        if (v) {
            const month = String(v.month).padStart(2, "0");
            const day = String(v.day).padStart(2, "0");

            const formattedDate = `${v.year}-${month}-${day}`;

            onChange(formattedDate);
        } else {
            onChange("");
        }
    };

    const parsedValue = value && value.trim() !== "" ? parseDate(value) : null;
    const minDate = parseDate(new Date().toISOString().split("T")[0]);

    return (
        <I18nProvider locale="en-US">
            <DatePicker
                aria-label="Expiration date picker"
                className="w-full"
                isDateUnavailable={(date) => {
                    const now = new Date();

                    now.setHours(0, 0, 0, 0);
                    const dateJs = new Date(date.year, date.month - 1, date.day);

                    return dateJs < now;
                }}
                minValue={minDate}
                value={parsedValue}
                onChange={handleSelection}
            >
                <Label className="text-sm font-medium mb-2">Expiration Date</Label>
                <DateField.Group className="border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 hover:ring-2 hover:ring-blue-400">
                    <DateField.Input className="rounded-full dark:text-white">
                        {(segment) => <DateField.Segment segment={segment} />}
                    </DateField.Input>
                    <DateField.Suffix>
                        <DatePicker.Trigger>
                            <DatePicker.TriggerIndicator className="text-gray-500 dark:text-gray-400" />
                        </DatePicker.Trigger>
                    </DateField.Suffix>
                </DateField.Group>
                <DatePicker.Popover className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl">
                    <Calendar aria-label="Choose date">
                        <Calendar.Header>
                            <Calendar.YearPickerTrigger>
                                <Calendar.YearPickerTriggerHeading />
                                <Calendar.YearPickerTriggerIndicator />
                            </Calendar.YearPickerTrigger>
                            <Calendar.NavButton slot="previous" />
                            <Calendar.NavButton slot="next" />
                        </Calendar.Header>
                        <Calendar.Grid>
                            <Calendar.GridHeader>
                                {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                            </Calendar.GridHeader>
                            <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
                        </Calendar.Grid>
                        <Calendar.YearPickerGrid>
                            <Calendar.YearPickerGridBody>
                                {({ year }) => (
                                    <Calendar.YearPickerCell
                                        className="data-selected:bg-blue-500 data-selected:text-white"
                                        year={year}
                                    />
                                )}
                            </Calendar.YearPickerGridBody>
                        </Calendar.YearPickerGrid>
                    </Calendar>
                </DatePicker.Popover>
            </DatePicker>
        </I18nProvider>
    );
}
