import json
import time
import threading
import tkinter as tk
from tkinter import messagebox, scrolledtext

import requests


KOPPS_COURSES_URL = "https://api.kth.se/api/kopps/v2/courses?l=en"
DETAIL_URL_TEMPLATE = "https://api.kth.se/api/kopps/v2/course/{code}/detailedinformation?l=en"
DEPARTMENT_KEYWORD = "Människocentrerad teknologi"
OUTPUT_FILENAME = "course.json"


def has_course_round_terms(detailed_info: dict) -> bool:
    """
    Safely check whether there is at least one courseRoundTerms entry
    in any round in detailedInformation.
    """
    round_infos = detailed_info.get("roundInfos") or []
    for ri in round_infos:
        rnd = ri.get("round") or {}
        course_round_terms = rnd.get("courseRoundTerms") or []
        if course_round_terms:  # non-empty list means we have at least one term
            return True
    return False


class KTHCrawlerGUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("KTH Courses Crawler")

        # Window size
        self.root.geometry("640x480")

        # Top description label
        self.label = tk.Label(
            root,
            text=(
                "Fetch KTH courses and export to JSON"
            ),
            wraplength=600,
            justify="center",
        )
        self.label.pack(pady=10)

        # Department filter option
        self.only_department_var = tk.BooleanVar(value=True)
        self.dept_checkbox = tk.Checkbutton(
            root,
            text=f"Only courses from department containing '{DEPARTMENT_KEYWORD}'",
            variable=self.only_department_var,
        )
        self.dept_checkbox.pack(anchor="w", padx=10, pady=5)

        # Info about output file (fixed name)
#         self.output_label = tk.Label(
#             root,
#             text=f"Output file: {OUTPUT_FILENAME} (in the same folder as this program)",
#             justify="left",
#         )
#         self.output_label.pack(anchor="w", padx=10, pady=5)

        # Run button
        self.run_btn = tk.Button(
            root, text="Start Fetching Courses", command=self.start_crawling, height=2
        )
        self.run_btn.pack(pady=10)

        # Log window
        self.log = scrolledtext.ScrolledText(root, state="disabled", height=15)
        self.log.pack(fill="both", expand=True, padx=10, pady=5)

    # --- UI helpers ---

    def log_message(self, message: str):
        """Safely append a message to the log from any thread."""
        def _append():
            self.log.configure(state="normal")
            self.log.insert(tk.END, message + "\n")
            self.log.see(tk.END)
            self.log.configure(state="disabled")

        self.root.after(0, _append)

    def set_running_state(self, running: bool):
        """Enable/disable the run button to avoid double clicks."""
        def _set():
            if running:
                self.run_btn.config(state="disabled", text="Fetching… please wait")
            else:
                self.run_btn.config(state="normal", text="Start Fetching Courses")

        self.root.after(0, _set)

    # --- Crawling logic ---

    def start_crawling(self):
        # Run in a background thread so the GUI stays responsive
        t = threading.Thread(target=self.crawl_and_save, daemon=True)
        t.start()

    def crawl_and_save(self):
        self.set_running_state(True)
        self.log_message("Calling KTH API for course list…")

        try:
            # 1) Fetch all courses
            res = requests.get(KOPPS_COURSES_URL, timeout=30)
            res.raise_for_status()
            data = res.json()
        except Exception as e:
            self.log_message(f"[ERROR] Failed to load course list: {e}")
            messagebox.showerror("Error", f"Failed to load course list:\n{e}")
            self.set_running_state(False)
            return

        self.log_message(f"Total courses fetched: {len(data)}")

        # 2) Filter out CANCELLED
        active_data = [
            c for c in data
            if c.get("state") != "CANCELLED"
        ]

        self.log_message(f"After removing CANCELLED: {len(active_data)} courses remain")

        # Optionally filter by department
        if self.only_department_var.get():
            active_data = [
                c
                for c in active_data
                if DEPARTMENT_KEYWORD in (c.get("department") or "")
            ]
            self.log_message(
                f"After filtering by department containing '{DEPARTMENT_KEYWORD}': "
                f"{len(active_data)} courses remain"
            )
        else:
            self.log_message(
                "Department filter disabled: using all non-CANCELLED courses."
            )

        if not active_data:
            self.log_message("No courses match the current filter settings.")
            messagebox.showinfo("Done", "No courses match the current filter settings.")
            self.set_running_state(False)
            return

        detailed_courses = []

        # 3) Fetch details for each course, and keep only those with courseRoundTerms
        for idx, course in enumerate(active_data, start=1):
            code = course.get("code")
            self.log_message(f"[{idx}/{len(active_data)}] Fetching details for course {code}…")

            detail_url = DETAIL_URL_TEMPLATE.format(code=code)
            try:
                detail_res = requests.get(detail_url, timeout=30)

                if detail_res.ok:
                    detail_data = detail_res.json()
                    merged = {**course, "detailedInformation": detail_data}

                    if has_course_round_terms(detail_data):
                        detailed_courses.append(merged)
                        #self.log_message("  → Has courseRoundTerms, added to output.")
                    else:
                        self.log_message("  → No course period data found, skipped.")
                else:
                    self.log_message(
                        f"  → Failed to fetch details (HTTP {detail_res.status_code}), "
                        "keeping basic course info."
                    )
                    detailed_courses.append(course)

            except Exception as e:
                self.log_message(f"  → Error while fetching details: {e}, keeping basic info.")
                detailed_courses.append(course)

            # Be polite to the API
            time.sleep(0.1)

        # 4) Write JSON to fixed file name
        try:
            with open(OUTPUT_FILENAME, "w", encoding="utf-8") as f:
                json.dump(detailed_courses, f, ensure_ascii=False, indent=2)
            self.log_message(f"Done! Saved courses to: {OUTPUT_FILENAME}")
            messagebox.showinfo("Done", f"Course data has been saved to:\n{OUTPUT_FILENAME}")
        except Exception as e:
            self.log_message(f"[ERROR] Failed to write JSON: {e}")
            messagebox.showerror("Error", f"Failed to write JSON:\n{e}")
        finally:
            self.set_running_state(False)


def main():
    root = tk.Tk()
    app = KTHCrawlerGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
